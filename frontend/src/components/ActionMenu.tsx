import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export type ActionMenuItem = {
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onSelect: () => void;
  title?: string;
  tone?: 'default' | 'danger';
};

type ActionMenuProps = {
  ariaLabel?: string;
  disabled?: boolean;
  items: ActionMenuItem[];
};

export function ActionMenu({ ariaLabel = 'Actions', disabled = false, items }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDisabled = disabled || items.length === 0;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function updateMenuPosition() {
      const button = buttonRef.current;

      if (!button) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const menuWidth = 160;
      const viewportPadding = 8;
      const availableWidth = Math.max(120, window.innerWidth - viewportPadding * 2);
      const width = Math.min(menuWidth, availableWidth);
      const maxLeft = Math.max(viewportPadding, window.innerWidth - width - viewportPadding);
      const left = Math.min(
        Math.max(viewportPadding, rect.right - width),
        maxLeft,
      );

      setMenuStyle({
        left,
        top: rect.bottom + 4,
        width,
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !menuRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    updateMenuPosition();
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open]);

  const menu = (
    <div
      className={`fixed z-[10000] origin-top-right rounded-lg border border-slate-200 bg-white p-1 shadow-lg transition duration-150 ${
        open
          ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
      }`}
      onClick={(event) => event.stopPropagation()}
      ref={menuRef}
      role="menu"
      style={menuStyle}
    >
      {items.map((item) => (
        <button
          className={`flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
            item.tone === 'danger'
              ? 'text-red-600 hover:bg-red-50'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          disabled={item.disabled}
          key={item.label}
          onClick={() => {
            setOpen(false);
            item.onSelect();
          }}
          role="menuitem"
          title={item.title}
          type="button"
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div
      className="inline-flex"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isDisabled}
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        title={ariaLabel}
        type="button"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? createPortal(menu, document.body) : null}
    </div>
  );
}
