import { Loader2 } from 'lucide-react';

const Button = ({ children, variant = 'primary', size = 'md', loading = false, icon: Icon, className = '', ...props }) => {
    const variants = {
        primary: 'btn-primary', secondary: 'btn-secondary',
        danger: 'btn-danger', ghost: 'btn-ghost', success: 'btn-success',
    };
    const sizes = { sm: 'px-3 py-1.5 text-xs', md: '', lg: 'px-6 py-3 text-base' };

    return (
        <button className={`btn ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || props.disabled} {...props}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
            {children}
        </button>
    );
};

export default Button;