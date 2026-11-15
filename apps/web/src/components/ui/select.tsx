'use client';
import {
  Children,
  Fragment,
  isValidElement,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Select as Primitive } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = { value: string; label: ReactNode; disabled?: boolean };
type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean };

// Radix reserves the empty string for "no value", so an empty option gets its own token.
const EMPTY = '__empty__';
const encode = (value: string) => (value === '' ? EMPTY : value);
const decode = (value: string) => (value === EMPTY ? '' : value);

function collect(children: ReactNode, options: Option[] = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<OptionProps>;
    if (element.type === 'option') {
      options.push({
        value: String(element.props.value ?? ''),
        label: element.props.children,
        disabled: element.props.disabled,
      });
    } else if (element.type === Fragment || element.type === 'optgroup') {
      collect(element.props.children, options);
    }
  });
  return options;
}

type Props = {
  value?: string | number;
  defaultValue?: string | number;
  /** Receives an event-like object, so code written for a native select keeps working. */
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  children: ReactNode;
  /** Shown before the selected label, inside the trigger. */
  icon?: ReactNode;
  contentClassName?: string;
} & Omit<ComponentProps<'button'>, 'value' | 'defaultValue' | 'onChange' | 'children'>;

/**
 * Animated replacement for the native select, built on Radix. It accepts the same
 * `<option>` children and `value`/`onChange` props, and submits through `name` in forms.
 */
export function Select({
  value,
  defaultValue,
  onChange,
  name,
  disabled,
  required,
  children,
  icon,
  className,
  contentClassName,
  ...trigger
}: Props) {
  const options = collect(children);
  const [own, setOwn] = useState(String(defaultValue ?? options[0]?.value ?? ''));
  const current = value !== undefined ? String(value) : own;
  return (
    <Primitive.Root
      value={encode(current)}
      onValueChange={(next) => {
        const decoded = decode(next);
        if (value === undefined) setOwn(decoded);
        onChange?.({
          target: { value: decoded, name: name ?? '' },
          currentTarget: { value: decoded, name: name ?? '' },
        } as unknown as ChangeEvent<HTMLSelectElement>);
      }}
      name={name}
      disabled={disabled}
      required={required}
    >
      <Primitive.Trigger className={cn('input select select-trigger', className)} {...trigger}>
        {icon}
        <span className="select-value">
          <Primitive.Value />
        </span>
        <Primitive.Icon className="select-chevron" asChild>
          <ChevronDown size={14} />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          position="popper"
          sideOffset={6}
          className={cn('select-content', contentClassName)}
        >
          <Primitive.Viewport className="select-viewport">
            {options.map((option) => (
              <Primitive.Item
                key={option.value}
                value={encode(option.value)}
                disabled={option.disabled}
                className="select-item"
              >
                <Primitive.ItemText>{option.label}</Primitive.ItemText>
                <Primitive.ItemIndicator className="select-check">
                  <Check size={14} />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
