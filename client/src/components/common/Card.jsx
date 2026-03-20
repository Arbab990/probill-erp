const Card = ({ children, className = '', hover = false, onClick }) => (
    <div className={`${hover ? 'card-hover' : 'card'} ${className}`} onClick={onClick}>
        {children}
    </div>
);

export default Card;