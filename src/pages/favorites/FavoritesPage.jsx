import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavorites, getHistory, toggleFavorite } from '../../lib/favorites';
import { itemKey } from '../../lib/search';
import { StarIcon } from '../../components/Icons';
import fifo from '../../assets/fifo.webp';
import './FavoritesPage.css';

function Card({ item, index, onOpen, onRemove }) {
  return (
    <div className="fav-card" style={{ '--row-color': item.color_primary, '--i': Math.min(index, 14) }}>
      <button type="button" className="fav-card__main" onClick={() => onOpen(item)}>
        <span className="fav-card__company">{item.company_name}</span>
        <span className="fav-card__label">{item.breed || item.label}</span>
        <span className="fav-card__category">{item.category_name}</span>
        <span className="fav-card__price">{item.price_display || 'Por confirmar'}</span>
      </button>
      {onRemove && (
        <button type="button" className="fav-card__remove" onClick={() => onRemove(item)} aria-label={`Quitar ${item.breed || item.label} de favoritos`}>
          <StarIcon filled size={18} />
        </button>
      )}
    </div>
  );
}

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState(getFavorites);
  const [leaving, setLeaving] = useState(null);
  const history = getHistory();

  const open = (item) => navigate('/precios', { state: { item } });

  const remove = (item) => {
    const key = itemKey(item);
    setLeaving(key);
    setTimeout(() => {
      toggleFavorite(item);
      setFavorites(getFavorites());
      setLeaving(null);
    }, 280);
  };

  return (
    <div className="favorites">
      <header className="favorites__head">
        <h1 className="favorites__title">Favoritos</h1>
        <p className="favorites__sub">Los servicios que marcaste con la estrella en Precios. Se guardan en esta computadora.</p>
      </header>

      {favorites.length ? (
        <ul className="fav-grid">
          {favorites.map((item, i) => (
            <li key={itemKey(item)} className={leaving === itemKey(item) ? 'fav-slot is-leaving' : 'fav-slot'}>
              <Card item={item} index={i} onOpen={open} onRemove={remove} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="favorites__empty">
          <img src={fifo} alt="" />
          <p>Todavía no tienes favoritos. En Precios, toca la estrella del ticket para guardar un servicio aquí.</p>
          <button type="button" className="favorites__cta" onClick={() => navigate('/precios')}>
            Ir a Precios
          </button>
        </div>
      )}

      {history.length > 0 && (
        <section className="favorites__history">
          <h2 className="favorites__h2">Vistos hace poco</h2>
          <ul className="fav-grid fav-grid--compact">
            {history.map((item, i) => (
              <li key={itemKey(item)} className="fav-slot">
                <Card item={item} index={i} onOpen={open} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
