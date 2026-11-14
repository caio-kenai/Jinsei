'use client';
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
/** Layouts that can be chosen for a view. */
export const availableLayouts: Layout[] = ['list', 'gallery'];

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
  const [renaming, setRenaming] = useState<SavedView | null>(null);
  const [name, setName] = useState('');
  return (
    <div className="view-tabs" role="tablist" aria-label="Visualizações da biblioteca">
      {views.map((view) => {
        const active = view.id === activeId;
        const Icon = layoutIcons[active ? activeLayout : view.config.layout];
        return (
          <div className={`view-tab-wrapper ${active ? 'active' : ''}`} key={view.id}>
            <button
              role="tab"
              aria-selected={active}
              className={`view-tab ${active ? 'active' : ''}`}
              onClick={() => onActivate(view)}
            >
              <Icon size={14} />
              {view.name}
            </button>
            {active && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="view-tab-menu" aria-label={`Opções de ${view.name}`}>
                    <ChevronDown size={12} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Exibir como</DropdownMenuLabel>
                  {availableLayouts.map((layout) => {
                    const LayoutIcon = layoutIcons[layout];
                    return (
                      <DropdownMenuItem key={layout} onSelect={() => onLayout(layout)}>
                        <LayoutIcon size={13} />
                        {layoutLabels[layout]}
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
                    Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onDuplicate(view)}>
                    <Copy size={13} />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onDelete(view)}>
                    <Trash2 size={13} />
                    Excluir visualização
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
            Visualização
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Nova visualização</DropdownMenuLabel>
          {availableLayouts.map((layout) => {
            const LayoutIcon = layoutIcons[layout];
            return (
              <DropdownMenuItem key={layout} onSelect={() => onCreate(layout)}>
                <LayoutIcon size={13} />
                {layoutLabels[layout]}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="view-count">{count} títulos</span>
      <Dialog open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogTitle className="dialog-title">Renomear visualização</DialogTitle>
          <DialogDescription className="dialog-description">
            Escolha um nome curto para encontrar esta visualização depois.
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
              aria-label="Nome da visualização"
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="dialog-footer">
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar nome</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
