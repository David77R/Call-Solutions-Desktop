import './ComingSoon.css';

export default function ComingSoon({ title }) {
  return (
    <section className="coming-soon">
      <h1 className="coming-soon__title">{title}</h1>
      <p className="coming-soon__body">Esta sección todavía no está en la versión de escritorio. Mientras tanto, úsala desde la app móvil.</p>
    </section>
  );
}
