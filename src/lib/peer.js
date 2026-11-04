const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

function waitIce(pc, ms = 2500) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => pc.iceGatheringState === 'complete' && done();
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(done, ms);
  });
}

function opened(channel) {
  if (channel.readyState === 'open') return Promise.resolve();
  return new Promise((resolve) => channel.addEventListener('open', () => resolve(), { once: true }));
}

export class PeerLink {
  constructor(pc, channels) {
    this.pc = pc;
    this.channels = channels;
    this.handlers = new Set();
    this.closed = false;
    Object.values(channels).forEach((ch) =>
      ch.addEventListener('message', (e) => {
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        this.handlers.forEach((h) => h(msg));
      }),
    );
    const lost = () => {
      if (this.closed) return;
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) this.handlers.forEach((h) => h({ t: 'lost' }));
    };
    pc.addEventListener('connectionstatechange', lost);
    Object.values(channels).forEach((ch) => ch.addEventListener('close', () => !this.closed && this.handlers.forEach((h) => h({ t: 'lost' }))));
  }

  ready() {
    return Promise.all(Object.values(this.channels).map(opened));
  }

  send(kind, msg) {
    const ch = this.channels[kind];
    if (ch?.readyState === 'open') ch.send(JSON.stringify(msg));
  }

  on(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close() {
    this.closed = true;
    Object.values(this.channels).forEach((ch) => ch.close());
    this.pc.close();
  }
}

export async function hostOffer() {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const fast = pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 });
  const sure = pc.createDataChannel('sure');
  await pc.setLocalDescription(await pc.createOffer());
  await waitIce(pc);
  const { type, sdp } = pc.localDescription;
  return { link: new PeerLink(pc, { fast, sure }), offer: { type, sdp } };
}

export async function hostAccept(link, answer) {
  if (link.pc.signalingState === 'have-local-offer') await link.pc.setRemoteDescription(answer);
}

export async function guestAnswer(offer) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channels = {};
  const got = new Promise((resolve) => {
    pc.addEventListener('datachannel', (e) => {
      channels[e.channel.label] = e.channel;
      if (channels.fast && channels.sure) resolve();
    });
  });
  await pc.setRemoteDescription(offer);
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIce(pc);
  const { type, sdp } = pc.localDescription;
  return {
    answer: { type, sdp },
    link: got.then(() => new PeerLink(pc, channels)),
    pc,
  };
}
