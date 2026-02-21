import { LucideIcon } from 'lucide-react';

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  color?: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface TechItem {
  name: string;
  category: 'Frontend' | 'Backend' | 'AI' | 'Tools';
}
