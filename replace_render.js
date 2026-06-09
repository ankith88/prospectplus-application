const fs = require('fs');
const file = 'src/components/account-manager/am-reports-dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

const replacement = `
    return (
        <div className="p-6 h-full flex flex-col bg-[#d0dfcd] min-h-screen overflow-y-auto">
            <header className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <ActivityIcon className="h-6 w-6 text-[#095c7b]" />
                    <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">Account Manager Reports</h1>
                </div>
                <p className="text-[#095c7b]/80">Activity and Pipeline Value Metrics</p>
            </header>
            
            <Card className="mb-6 border-[#095c7b]/10 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2 text-[#095c7b]"><Filter className="h-5 w-5" /><CardTitle>Filters</CardTitle></div>
                    {(isAdmin || isAm) && (
                        <Select value={selectedAm} onValueChange={setSelectedAm}>
                            <SelectTrigger className="w-[200px] bg-white border-[#095c7b]/20 text-xs">
                                <SelectValue placeholder="All Account Managers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Account Managers</SelectItem>
                                {accountManagers.map(am => {
                                    const name = getAmName(am);
                                    return <SelectItem key={am.uid || am.email || name} value={name}>{name}</SelectItem>
                                })}
                            </SelectContent>
                        </Select>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Activity Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs bg-white h-9">
                                        <CalendarIconLucide className="mr-2 h-3 w-3" />
                                        {activityDateRange?.from ? (
                                            activityDateRange.to ? (
                                                <>{format(activityDateRange.from, "LLL dd, y")} - {format(activityDateRange.to, "LLL dd, y")}</>
                                            ) : format(activityDateRange.from, "LLL dd, y")
                                        ) : (
                                            <span>All Time</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 flex" align="start">
                                    <Calendar mode="range" selected={activityDateRange} onSelect={setActivityDateRange} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Lead Entered Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs bg-white h-9">
                                        <CalendarIconLucide className="mr-2 h-3 w-3" />
                                        {leadEnteredDateRange?.from ? (
                                            leadEnteredDateRange.to ? (
                                                <>{format(leadEnteredDateRange.from, "LLL dd, y")} - {format(leadEnteredDateRange.to, "LLL dd, y")}</>
                                            ) : format(leadEnteredDateRange.from, "LLL dd, y")
                                        ) : (
                                            <span>All Time</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 flex" align="start">
                                    <Calendar mode="range" selected={leadEnteredDateRange} onSelect={setLeadEnteredDateRange} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Franchisee</Label>
                            <MultiSelectCombobox 
                                options={franchiseeOptions} 
                                selected={selectedFranchisee} 
                                onSelectedChange={setSelectedFranchisee} 
                                placeholder="All Franchisees..." 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Bucket</Label>
                            <MultiSelectCombobox 
                                options={bucketOptions} 
                                selected={selectedBucket} 
                                onSelectedChange={setSelectedBucket} 
                                placeholder="All Buckets..." 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Status</Label>
                            <MultiSelectCombobox 
                                options={statusOptions} 
                                selected={selectedStatus} 
                                onSelectedChange={setSelectedStatus} 
                                placeholder="All Statuses..." 
                            />
                        </div>
                        <Button variant="ghost" onClick={clearFilters} className="h-9 text-xs"><X className="mr-2 h-3 w-3"/> Clear Filters</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Top KPI Cards */}
`;

const startIndex = code.indexOf('return (\n        <div className="p-6 h-full flex flex-col bg-[#d0dfcd] min-h-screen overflow-y-auto">');
const endIndex = code.indexOf('{/* Top KPI Cards */}');

if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex + 21);
    fs.writeFileSync(file, code);
} else {
    console.log("Could not find start or end index.");
}

