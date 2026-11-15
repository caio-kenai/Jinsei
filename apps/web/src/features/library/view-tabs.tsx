'use client';
import { useT } from '@/i18n/provider';
import { useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Columns3,
  Copy,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { layoutLabels, type SavedView, type SavedViewConfig } from '@jinsei/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type Layout = SavedViewConfig['layout'];
export const layoutIcons: Record<Layout, LucideIcon> = {
  list: List,
  gallery: LayoutGrid,
  board: Columns3,
  calendar: CalendarDays,
};
/** Each layout keeps its own icon color, like ClickUp's view tabs. */
export const layoutColors: Record<Layout, string> = {
  list: '#4f6bed',
  gallery: '#e5306f',
  board: '#7050cf',
  calendar: '#f7832b',
};
/** Layouts that can be chosen for a view. */
export const availableLayouts: Layout[] = ['list', 'gallery', 'board', 'calendar'];

export function ViewTabs({
  views,
  activeId,
  count,
  onActivate,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onLayout,
  activeLayout,
}: {
  views: SavedView[];
  activeId: string;
  count: number;
  onActivate: (view: SavedView) => void;
  onCreate: (layout: Layout) => void;
  onRename: (view: SavedView, name: string) => void;
  onDuplicate: (view: SavedView) => void;
  onDelete: (view: SavedView) => void;
  onLayout: (layout: Layout) => void;
  activeLayout: Layout;
}) {
  const t = useT();
  const [renaming, setRenaming] = useState<SavedView | null>(null);
  const [name, setName] = useState('');
  return (
    <div className="view-tabs" role="tablist" aria-label={t('Visualizações da biblioteca')}>
      {views.map((view) => {
        const active = view.id === activeId;
        const layout = active ? activeLayout : view.config.layout;
        const Icon = layoutIcons[layout];
        return (
          <div className={`view-tab-wrapper ${active ? 'active' : ''}`} key={view.id}>
            <button
              role="tab"
              aria-selected={active}
              className={`view-tab ${active ? 'active' : ''}`}
              onClick={() => onActivate(view)}
            >
              <Icon size={14} style={{ color: layoutColors[layout] }} />
              {view.id.startsWith('default:') ? t(view.name) : view.name}
              {active && (
                <motion.span
                  layoutId="view-tab-indicator"
                  className="view-tab-indicator"
                  aria-hidden="true"
                />
              )}
            </button>
            {active && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="view-tab-menu"
                    aria-label={t('Opções de {name}', { name: view.name })}
                  >
                    <ChevronDown size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>{t('Exibir como')}</DropdownMenuLabel>
                  {availableLayouts.map((layout) => {
                    const LayoutIcon = layoutIcons[layout];
                    return (
                      <DropdownMenuItem key={layout} onSelect={() => onLayout(layout)}>
                        <LayoutIcon size={13} style={{ color: layoutColors[layout] }} />
                        {t(layoutLabels[layout])}
                        {layout === activeLayout ? ' ✓' : ''}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      setName(view.name);
                      setRenaming(view);
                    }}
                  >
                    <Pencil size={13} />
                    {t('Renomear')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onDuplicate(view)}>
                    <Copy size={13} />
                    {t('Duplicar')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onDelete(view)}>
                    <Trash2 size={13} />
                    {t('Excluir visualização')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="view-tab view-tab-add">
            <Plus size={13} />
            {t('Visualização')}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>{t('Nova visualização')}</DropdownMenuLabel>
          {availableLayouts.map((layout) => {
            const LayoutIcon = layoutIcons[layout];
            return (
              <DropdownMenuItem key={layout} onSelect={() => onCreate(layout)}>
                <LayoutIcon size={13} style={{ color: layoutColors[layout] }} />
                {t(layoutLabels[layout])}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="view-count">
        {count} {t('títulos')}
      </span>
      <Dialog open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogTitle className="dialog-title">{t('Renomear visualização')}</DialogTitle>
          <DialogDescription className="dialog-description">
            {t('Escolha um nome curto para encontrar esta visualização depois.')}
          </DialogDescription>
          <form
            className="dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (renaming && name.trim()) onRename(renaming, name.trim());
              setRenaming(null);
            }}
          >
            <Input
              autoFocus
              aria-label={t('Nome da visualização')}
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="dialog-footer">
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>
                {t('Cancelar')}
              </Button>
              <Button type="submit">{t('Salvar nome')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
