import './ProductCardSkeleton.css'

export default function ProductCardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card__image skeleton" />
      <div className="skeleton-card__info">
        <div className="skeleton skeleton-card__tag" />
        <div className="skeleton skeleton-card__name" />
        <div className="skeleton skeleton-card__price" />
      </div>
    </div>
  )
}
