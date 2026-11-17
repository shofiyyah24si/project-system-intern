export default function InputField({
  name,
  type = "text",
  placeholder,
  value,
  onChange,
}) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91] transition"
    />
  );
}
