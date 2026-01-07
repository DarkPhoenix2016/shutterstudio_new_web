import { 
  LayoutDashboard, CalendarDays, CheckSquare, MessageSquare, Grid, Banknote, 
  Camera, Users, Settings, UserCog, FileText, BarChart3, Shield, Database, 
  Server, Home, Briefcase, ShoppingCart, Folder, Menu, ArrowUp, ArrowDown, 
  Plus, Trash2, Edit, X, Search, Bell, Mail, Phone, MapPin, Globe, 
  LogOut, ChevronRight, ChevronDown, ChevronLeft, Calendar, 
  CreditCard, PieChart, Activity, Layers, Image as ImageIcon, Link, 
  FileQuestion, ToggleLeft, Hash, Braces, Type, Loader2, Save, 
  AlertCircle, CheckCircle2, Copy, MoreHorizontal, MoreVertical
} from "lucide-react"
import { type LucideIcon } from "lucide-react"

/**
 * EXPLICIT ICON MAPPING
 * * We manually map these to ensure they survive tree-shaking 
 * and are available for the dynamic dropdown.
 */
export const ICONS: Record<string, LucideIcon> = {
  "LayoutDashboard": LayoutDashboard,
  "CalendarDays": CalendarDays,
  "CheckSquare": CheckSquare,
  "MessageSquare": MessageSquare,
  "Grid": Grid,
  "Banknote": Banknote,
  "Camera": Camera,
  "Users": Users,
  "Settings": Settings,
  "UserCog": UserCog,
  "FileText": FileText,
  "BarChart3": BarChart3,
  "Shield": Shield,
  "Database": Database,
  "Server": Server,
  "Home": Home,
  "Briefcase": Briefcase,
  "ShoppingCart": ShoppingCart,
  "Folder": Folder,
  "Menu": Menu,
  "ArrowUp": ArrowUp,
  "ArrowDown": ArrowDown,
  "Plus": Plus,
  "Trash2": Trash2,
  "Edit": Edit,
  "X": X,
  "Search": Search,
  "Bell": Bell,
  "Mail": Mail,
  "Phone": Phone,
  "MapPin": MapPin,
  "Globe": Globe,
  "LogOut": LogOut,
  "ChevronRight": ChevronRight,
  "ChevronLeft": ChevronLeft,
  "ChevronDown": ChevronDown,
  "Calendar": Calendar,
  "CreditCard": CreditCard,
  "PieChart": PieChart,
  "Activity": Activity,
  "Layers": Layers,
  "Image": ImageIcon,
  "Link": Link,
  "ToggleLeft": ToggleLeft,
  "Hash": Hash,
  "Braces": Braces,
  "Type": Type,
  "Loader2": Loader2,
  "Save": Save,
  "AlertCircle": AlertCircle,
  "CheckCircle2": CheckCircle2,
  "Copy": Copy,
  "MoreHorizontal": MoreHorizontal,
  "MoreVertical": MoreVertical,
  // Add fallback
  "FileQuestion": FileQuestion
}

/**
 * Public list of icon names (sorted)
 * Used for the Dropdown options
 */
export const ICON_OPTIONS = Object.keys(ICONS).sort()

/**
 * Safe icon getter with fallback
 */
export function getIcon(name: string): LucideIcon {
  return ICONS[name] || FileQuestion
}