import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Selector con búsqueda: escribe para filtrar opciones.
 * options: [{ value, label }]
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Buscar…',
  emptyText = 'Sin resultados',
  required = false,
  disabled = false,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) setQuery(selected?.label || '');
  }, [selected, open]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (opt) => {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  };

  return (
    <div className={`search-select ${open ? 'open' : ''}`} ref={rootRef}>
      <input
        type="text"
        className="search-select-input"
        value={open ? query : (selected?.label || query)}
        disabled={disabled}
        required={required && !value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[0]) pick(filtered[0]);
          }
        }}
      />
      {open && (
        <div className="search-select-menu" role="listbox">
          {filtered.length === 0 && <div className="search-select-empty">{emptyText}</div>}
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`search-select-option ${opt.value === value ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(opt)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
