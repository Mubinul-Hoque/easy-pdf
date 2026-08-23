import { PDFToolMeta } from './types';

export const PDF_TOOLS: PDFToolMeta[] = [
  // A. ORGANIZE PDF
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    shortDesc: 'Combine multiple PDFs into one unified document',
    description: 'Merge multiple PDF files in the exact order you want. Combine pages seamlessly into one unified document.',
    category: 'organize',
    href: '/tools/merge-pdf',
    icon: 'Layers',
    color: 'from-blue-500 to-indigo-600',
    badge: 'Popular'
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    shortDesc: 'Extract pages or split into separate documents',
    description: 'Separate one page or a whole set for easy conversion into independent PDF files with page ranges.',
    category: 'organize',
    href: '/tools/split-pdf',
    icon: 'Scissors',
    color: 'from-indigo-500 to-purple-600'
  },
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    shortDesc: 'Sort, delete, rotate, and rearrange pages',
    description: 'Interactive visual page organizer. Drag-and-drop to reorder, delete blank pages, duplicate, or rotate.',
    category: 'organize',
    href: '/tools/organize-pdf',
    icon: 'Grid',
    color: 'from-purple-500 to-pink-600',
    badge: 'Interactive'
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    shortDesc: 'Rotate pages 90°, 180°, or 270° permanently',
    description: 'Rotate individual pages or all pages at once to portrait or landscape orientations with live previews.',
    category: 'organize',
    href: '/tools/rotate-pdf',
    icon: 'RotateCw',
    color: 'from-pink-500 to-rose-600'
  },


  // C. OPTIMIZE PDF
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    shortDesc: 'Reduce single or bulk PDF file sizes up to 90%',
    description: 'Optimize single or multiple PDF documents in bulk with customizable compression levels, ZIP packaging, and instant downloads.',
    category: 'optimize',
    href: '/tools/compress-pdf',
    icon: 'Minimize2',
    color: 'from-amber-500 to-orange-600',
    badge: 'Bulk • Up to 90%'
  },
  {
    id: 'repair-pdf',
    name: 'Repair PDF',
    shortDesc: 'Recover and fix damaged or corrupted PDF files',
    description: 'Rebuild broken cross-reference tables, stream trailers, and restore unreadable PDF documents.',
    category: 'optimize',
    href: '/tools/repair-pdf',
    icon: 'Wrench',
    color: 'from-rose-500 to-red-600'
  },
  {
    id: 'ocr-pdf',
    name: 'OCR PDF',
    shortDesc: 'Make scanned documents searchable & selectable',
    description: 'Extract text from scanned PDFs with optical character recognition across 100+ languages.',
    category: 'optimize',
    href: '/tools/ocr-pdf',
    icon: 'Search',
    color: 'from-violet-500 to-purple-600',
    badge: 'Searchable'
  }
];
