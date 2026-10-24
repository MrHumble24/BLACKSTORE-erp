import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '@/shared/lib';
import { CameraScanButton } from '@/shared/ui';
import { useCommandStore, useCommandShortcut } from '../model/command.store';
import { useCommandItems } from '../model/useCommandItems';
import type { CommandItem } from '../model/types';
import { CommandItemRow } from './CommandItemRow';
import { CommandFooter } from './CommandFooter';

interface SearchInputProps {
  query: string;
  setQuery: (q: string) => void;
  isLookingUp: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function CommandSearchInput({
  query,
  setQuery,
  isLookingUp,
  onKeyDown,
  inputRef,
}: SearchInputProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 border-b border-hairline-silver/70 dark:border-[#2d3039] px-4 py-3 bg-gallery-white dark:bg-[#1a1b20]">
      <div className="flex items-center text-steel shrink-0">
        {isLookingUp ? (
          <Loader2 className="h-4 w-4 animate-spin text-pricing-blue" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('command.searchPlaceholder')}
        className="flex-1 bg-transparent text-sm text-ink placeholder:text-steel focus:outline-none tracking-[-0.01em]"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="rounded p-1 text-steel hover:text-ink hover:bg-control-gray/50 cursor-pointer"
          aria-label="Clear query"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <CameraScanButton onScan={(code) => setQuery(code)} />
    </div>
  );
}

interface SectionProps {
  title: string;
  items: CommandItem[];
  selectedIndex: number;
  startIndex: number;
  onSelect: (item: CommandItem) => void;
  setSelectedIndex: (idx: number) => void;
}

function CommandSection({
  title,
  items,
  selectedIndex,
  startIndex,
  onSelect,
  setSelectedIndex,
}: SectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <div className="px-3.5 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-steel uppercase">
        {title}
      </div>
      {items.map((item, idx) => {
        const itemGlobalIndex = startIndex + idx;
        return (
          <CommandItemRow
            key={item.id}
            item={item}
            isSelected={selectedIndex === itemGlobalIndex}
            onSelect={() => onSelect(item)}
            onMouseEnter={() => setSelectedIndex(itemGlobalIndex)}
          />
        );
      })}
    </div>
  );
}

function useCommandKeyboardNav(
  allItems: CommandItem[],
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>,
  handleClose: () => void,
) {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length ? (prev + 1) % allItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (allItems.length ? (prev - 1 + allItems.length) % allItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setSelectedIndex((current) => {
        if (allItems[current]) allItems[current].perform();
        return current;
      });
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };
}

interface ListProps {
  allItems: CommandItem[];
  lookupItems: CommandItem[];
  actionItems: CommandItem[];
  pageItems: CommandItem[];
  selectedIndex: number;
  setSelectedIndex: (idx: number) => void;
}

function CommandDialogList({
  allItems,
  lookupItems,
  actionItems,
  pageItems,
  selectedIndex,
  setSelectedIndex,
}: ListProps) {
  const { t } = useTranslation();
  if (allItems.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-steel">
        {t('command.noResults')}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <CommandSection
        title={t('command.search')}
        items={lookupItems}
        selectedIndex={selectedIndex}
        startIndex={0}
        onSelect={(item) => item.perform()}
        setSelectedIndex={setSelectedIndex}
      />
      <CommandSection
        title={t('command.actions')}
        items={actionItems}
        selectedIndex={selectedIndex}
        startIndex={lookupItems.length}
        onSelect={(item) => item.perform()}
        setSelectedIndex={setSelectedIndex}
      />
      <CommandSection
        title={t('command.pages')}
        items={pageItems}
        selectedIndex={selectedIndex}
        startIndex={lookupItems.length + actionItems.length}
        onSelect={(item) => item.perform()}
        setSelectedIndex={setSelectedIndex}
      />
    </div>
  );
}

/** Apple Spotlight / Command+K dialog for system-wide fast search, scan, and actions. */
export function CommandDialog() {
  const open = useCommandStore((s) => s.open);
  const setOpen = useCommandStore((s) => s.setOpen);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useCommandShortcut();

  const handleClose = () => setOpen(false);
  const { lookupItems, actionItems, pageItems, isLookingUp, allItems } =
    useCommandItems(query, handleClose);

  const handleKeyDown = useCommandKeyboardNav(allItems, setSelectedIndex, handleClose);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevQuery, setPrevQuery] = useState(query);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }

  if (query !== prevQuery) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);



  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[20%] z-50 grid w-[calc(100vw-2rem)] sm:w-full max-w-xl translate-x-[-50%] translate-y-0 gap-0 overflow-hidden rounded-2xl border border-hairline-silver/80 dark:border-[#2d3039] bg-gallery-white dark:bg-[#1a1b20] shadow-2xl duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-98 data-[state=open]:zoom-in-98',
          )}
        >
          <CommandSearchInput
            query={query}
            setQuery={setQuery}
            isLookingUp={isLookingUp}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
          />
          <div className="max-h-[60vh] overflow-y-auto p-2">
            <CommandDialogList
              allItems={allItems}
              lookupItems={lookupItems}
              actionItems={actionItems}
              pageItems={pageItems}
              selectedIndex={selectedIndex}
              setSelectedIndex={setSelectedIndex}
            />
          </div>
          <CommandFooter />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

