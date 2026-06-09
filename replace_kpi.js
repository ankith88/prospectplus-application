const fs = require('fs');
const file = 'src/components/account-manager/am-reports-dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

const replacement = `
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard 
                    title="Total Activities" 
                    value={metrics.totalActivities} 
                    icon={ActivityIcon} 
                    description={metrics.totalActivities > 0 ? \`\${metrics.totalCalls} Calls · \${metrics.totalEmails} Emails · \${metrics.totalMeetings} Meets\` : 'No activities found'}
                />
                <StatCard 
                    title="Pipeline MRR" 
                    value={\`$\${metrics.totalPipelineValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\`} 
                    icon={DollarSign} 
                    description="Potential Monthly Recurring Revenue"
                />
                <StatCard 
                    title="Leads with MRR" 
                    value={metrics.valueByLead.filter(l => l.value > 0).length} 
                    icon={TrendingUp} 
                    description="Leads quoting or won"
                />
                <StatCard 
                    title="Filtered Leads" 
                    value={displayedLeads.length} 
                    icon={Users} 
                    description="Matching all selected filters"
                />
            </div>
`;

const startIndex = code.indexOf('{/* Top KPI Cards */}');
const endIndex = code.indexOf('<Tabs defaultValue="overview" className="flex-1 flex flex-col">');

if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + replacement + "\n            " + code.substring(endIndex);
    fs.writeFileSync(file, code);
} else {
    console.log("Could not find start or end index.");
}

