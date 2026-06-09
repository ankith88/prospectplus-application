const fs = require('fs');
const file = 'src/components/account-manager/am-reports-dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Imports
code = code.replace(
    /import { Phone, Mail, FileText, Calendar, DollarSign, Activity as ActivityIcon, Users, Building, TrendingUp, ChevronRight, ChevronDown } from 'lucide-react';/,
    `import { Phone, Mail, FileText, Calendar as CalendarIconLucide, DollarSign, Activity as ActivityIcon, Users, Building, TrendingUp, ChevronRight, ChevronDown, Filter, X } from 'lucide-react';\nimport { MultiSelectCombobox, type Option } from '../ui/multi-select-combobox';\nimport { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';\nimport { Calendar } from '@/components/ui/calendar';\nimport { Label } from '@/components/ui/label';\nimport type { DateRange } from 'react-day-picker';\nimport { cn } from '@/lib/utils';\n\nconst StatCard = ({ title, value, icon: Icon, description, onClick }: { title: string; value: string | number; icon: React.ElementType; description?: string; onClick?: () => void }) => (\n  <Card className={cn("border-[#095c7b]/10 shadow-sm", onClick && "cursor-pointer hover:bg-muted/50 transition-colors")} onClick={onClick}>\n    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">\n      <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>\n      <div className="p-2 bg-[#095c7b]/10 rounded-lg"><Icon className="h-4 w-4 text-[#095c7b]" /></div>\n    </CardHeader>\n    <CardContent>\n      <div className="text-2xl font-bold text-[#095c7b]">{value}</div>\n      {description && <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>}\n    </CardContent>\n  </Card>\n);`
);

code = code.replace(/import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';/, `import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';`);

// 2. States
code = code.replace(
    /const \[selectedFranchisee, setSelectedFranchisee\] = useState<string>\('all'\);\n    const \[selectedBucket, setSelectedBucket\] = useState<string>\('all'\);\n    const \[selectedLeadType, setSelectedLeadType\] = useState<string>\('all'\);\n    const \[selectedStatus, setSelectedStatus\] = useState<string>\('all'\);/,
    `const [selectedFranchisee, setSelectedFranchisee] = useState<string[]>([]);\n    const [selectedBucket, setSelectedBucket] = useState<string[]>([]);\n    const [selectedLeadType, setSelectedLeadType] = useState<string[]>([]);\n    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);\n\n    const [activityDateRange, setActivityDateRange] = useState<DateRange | undefined>(undefined);\n    const [leadEnteredDateRange, setLeadEnteredDateRange] = useState<DateRange | undefined>(undefined);`
);
code = code.replace(/const \[dateRange, setDateRange\] = useState<'thisMonth' | 'lastMonth' | 'allTime'>\('thisMonth'\);/, '');

// 3. isDateInRange
code = code.replace(
    /const isDateInRange = \(dateStr: string\) => {[\s\S]*?return true;\n    };/,
    `const isActivityDateInRange = (dateStr: string) => {
        if (!activityDateRange?.from) return true;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return false;
        const fromDate = startOfDay(activityDateRange.from);
        const toDate = activityDateRange.to ? endOfDay(activityDateRange.to) : endOfDay(activityDateRange.from);
        return date >= fromDate && date <= toDate;
    };`
);

// 4. displayedLeads filter
code = code.replace(
    /const displayedLeads = useMemo\(\(\) => {[\s\S]*?}\), \[leads, selectedFranchisee, selectedBucket, selectedLeadType, selectedStatus\]\);/,
    `const displayedLeads = useMemo(() => {
        return leads.filter(lead => {
            if (selectedFranchisee.length > 0 && lead.franchisee && !selectedFranchisee.includes(lead.franchisee)) return false;
            if (selectedBucket.length > 0 && lead.bucket && !selectedBucket.includes(lead.bucket)) return false;
            if (selectedLeadType.length > 0 && (lead.leadType || 'Unknown') && !selectedLeadType.includes(lead.leadType || 'Unknown')) return false;
            
            const status = lead.customerStatus || lead.status;
            if (selectedStatus.length > 0 && status && !selectedStatus.includes(status)) return false;
            
            if (leadEnteredDateRange?.from) {
                const dateParts = (lead.dateLeadEntered || '').split('/');
                let enteredDate: Date | null = null;
                if (dateParts.length === 3) {
                    const [day, month, year] = dateParts.map(Number);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        const fullYear = year < 100 ? 2000 + year : year;
                        enteredDate = new Date(fullYear, month - 1, day);
                    }
                } else if (lead.dateLeadEntered) {
                    enteredDate = new Date(lead.dateLeadEntered);
                }
                
                if (!enteredDate || isNaN(enteredDate.getTime())) return false;
                
                const fromDate = startOfDay(leadEnteredDateRange.from);
                const toDate = leadEnteredDateRange.to ? endOfDay(leadEnteredDateRange.to) : endOfDay(leadEnteredDateRange.from);
                if (enteredDate < fromDate || enteredDate > toDate) return false;
            }
            return true;
        });
    }, [leads, selectedFranchisee, selectedBucket, selectedLeadType, selectedStatus, leadEnteredDateRange]);`
);

// 5. allActivities isDateInRange
code = code.replace(
    /if \(isDateInRange\(act.date\)\) {/,
    `if (isActivityDateInRange(act.date)) {`
);
code = code.replace(
    /}, \[displayedLeads, dateRange, selectedAm, accountManagers\]\);/,
    `}, [displayedLeads, activityDateRange, selectedAm, accountManagers]);`
);

// 6. MultiSelectOptions
const optionsInsert = `
    const franchiseeOptions: Option[] = useMemo(() => uniqueFranchisees.map(f => ({ value: f as string, label: f as string })), [uniqueFranchisees]);
    const bucketOptions: Option[] = useMemo(() => uniqueBuckets.map(b => ({ value: b as string, label: String(b).replace('_', ' ') })), [uniqueBuckets]);
    const leadTypeOptions: Option[] = useMemo(() => uniqueLeadTypes.map(t => ({ value: t as string, label: t as string })), [uniqueLeadTypes]);
    const statusOptions: Option[] = useMemo(() => uniqueStatuses.map(s => ({ value: s as string, label: s as string })), [uniqueStatuses]);
    const clearFilters = () => {
        setSelectedFranchisee([]);
        setSelectedBucket([]);
        setSelectedLeadType([]);
        setSelectedStatus([]);
        setActivityDateRange(undefined);
        setLeadEnteredDateRange(undefined);
        setSelectedAm('all');
    };
`;
code = code.replace(/if \(loading \|\| isLoadingData\) {/, optionsInsert + '\n    if (loading || isLoadingData) {');

fs.writeFileSync(file, code);
