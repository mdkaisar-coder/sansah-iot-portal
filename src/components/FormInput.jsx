export default function FormInput({ label, type = "text", id, placeholder, ...props }) {
  return (
    <div className="flex flex-col space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <input
        type={type}
        id={id}
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
}
