const Input = ({ label, error, className = '', ...props }) => (
    <div>
        {label && <label className="input-label">{label}</label>}
        <input className={`input-field ${error ? 'border-danger focus:border-danger' : ''} ${className}`} {...props} />
        {error && <p className="input-error">{error}</p>}
    </div>
);

export default Input;