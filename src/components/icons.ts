/**
 * Point d'entrée unique des icônes Lucide.
 *
 * Metro ne fait pas de tree-shaking : importer depuis le barrel
 * `lucide-react-native` embarquait les 1778 icônes du paquet, soit 1,6 Mo de
 * bundle pour les 40 réellement utilisées. On les importe donc une à une par
 * leur chemin profond.
 *
 * Pour en ajouter une : la chercher sur lucide.dev, puis ajouter une ligne
 * ici en reprenant le nom de fichier en kebab-case. Ne jamais réimporter
 * depuis 'lucide-react-native' directement.
 */

export {default as AlertTriangle} from 'lucide-react-native/icons/triangle-alert';
export {default as BarChart3} from 'lucide-react-native/icons/chart-column';
export {default as Check} from 'lucide-react-native/icons/check';
export {default as CheckCircle2} from 'lucide-react-native/icons/circle-check';
export {default as CircleCheck} from 'lucide-react-native/icons/circle-check';
export {default as DownloadCloud} from 'lucide-react-native/icons/cloud-download';
export {default as FileCheck2} from 'lucide-react-native/icons/file-check-corner';
export {default as Flag} from 'lucide-react-native/icons/flag';
export {default as Info} from 'lucide-react-native/icons/info';
export {default as Layers} from 'lucide-react-native/icons/layers';
export {default as LayoutDashboard} from 'lucide-react-native/icons/layout-dashboard';
export {default as LocateFixed} from 'lucide-react-native/icons/locate-fixed';
export {default as Lock} from 'lucide-react-native/icons/lock';
export {default as LogOut} from 'lucide-react-native/icons/log-out';
export {default as Mail} from 'lucide-react-native/icons/mail';
export {default as Map} from 'lucide-react-native/icons/map';
export {default as MapPin} from 'lucide-react-native/icons/map-pin';
export {default as MapPinned} from 'lucide-react-native/icons/map-pinned';
export {default as Maximize2} from 'lucide-react-native/icons/maximize-2';
export {default as Monitor} from 'lucide-react-native/icons/monitor';
export {default as Moon} from 'lucide-react-native/icons/moon';
export {default as Package} from 'lucide-react-native/icons/package';
export {default as PackageCheck} from 'lucide-react-native/icons/package-check';
export {default as PackageX} from 'lucide-react-native/icons/package-x';
export {default as RefreshCw} from 'lucide-react-native/icons/refresh-cw';
export {default as RotateCcw} from 'lucide-react-native/icons/rotate-ccw';
export {default as Route} from 'lucide-react-native/icons/route';
export {default as ScanLine} from 'lucide-react-native/icons/scan-line';
export {default as Search} from 'lucide-react-native/icons/search';
export {default as ShieldAlert} from 'lucide-react-native/icons/shield-alert';
export {default as ShieldCheck} from 'lucide-react-native/icons/shield-check';
export {default as SlidersHorizontal} from 'lucide-react-native/icons/sliders-horizontal';
export {default as Sun} from 'lucide-react-native/icons/sun';
export {default as Truck} from 'lucide-react-native/icons/truck';
export {default as User} from 'lucide-react-native/icons/user';
export {default as UserPlus} from 'lucide-react-native/icons/user-plus';
export {default as Wifi} from 'lucide-react-native/icons/wifi';
export {default as WifiOff} from 'lucide-react-native/icons/wifi-off';
export {default as Wrench} from 'lucide-react-native/icons/wrench';
export {default as X} from 'lucide-react-native/icons/x';
