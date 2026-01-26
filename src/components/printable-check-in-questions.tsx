'use client';

import React from 'react';

const reasonsToLeave = ['Post office', 'Banking / deposits', 'Local deliveries', 'Supplier drop-offs', 'Admin / errands', 'Other'];
const packageTypes = [ { id: '500g', label: '<500g' }, { id: '1-3kg', label: '1-3kg' }, { id: '5kg+', label: '5kg+' }, { id: '10kg+', label: '10kg+' }, { id: '20kg+', label: '20kg+' } ] as const;
const currentProviders = [ { id: 'multiple', label: 'Multiple' }, { id: 'auspost', label: 'AusPost' }, { id: 'couriersplease', label: 'CouriersPlease' }, { id: 'aramex', label: 'Aramex' }, { id: 'startrack', label: 'StarTrack' }, { id: 'tge', label: 'TGE' }, { id: 'fedex', label: 'FedEx/TNT' }, { id: 'allied', label: 'Allied' }, { id: 'other', label: 'Other' } ] as const;
const eCommerceTechs = [ { id: 'mypost', label: 'MyPost' }, { id: 'shopify', label: 'Shopify' }, { id: 'woo', label: 'Woo' }, { id: 'sendle', label: 'Sendle' }, { id: 'other', label: 'Other' }, { id: 'none', label: 'None' } ] as const;

export const PrintableCheckInQuestions = React.forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <div ref={ref} className="p-8 bg-white text-black w-[800px]">
            <h1 className="text-2xl font-bold mb-4 text-center">Check-in Discovery Questions</h1>

            <div className="space-y-6">
                <QuestionSection title="Company Details">
                    <TextInputLine label="Company Name" />
                    <TextInputLine label="Address" />
                </QuestionSection>

                <QuestionSection title="Contacts">
                    <ContactInputSet />
                    <ContactInputSet />
                    <ContactInputSet />
                </QuestionSection>

                <QuestionSection title="Relevance Check">
                    <p className="font-semibold">Do people leave the office during the day?</p>
                    <div className="flex gap-4"><CheckBox label="Yes" /> <CheckBox label="No" /></div>
                </QuestionSection>

                <QuestionSection title="Reasons People Leave">
                    <p className="font-semibold">What are some of the things people have to leave the office for?</p>
                    <div className="grid grid-cols-2 gap-2">
                        {reasonsToLeave.map(reason => <CheckBox key={reason} label={reason} />)}
                    </div>
                </QuestionSection>

                <QuestionSection title="Discovery: Logistics">
                    <p className="font-semibold">Do you have a relationship with Australia Post?</p>
                    <div className="flex gap-4"><CheckBox label="Yes - Driver" /> <CheckBox label="Yes - Post Office walk up" /> <CheckBox label="No" /></div>
                    <p className="font-semibold mt-4">How do you lodge items?</p>
                    <div className="flex gap-4"><CheckBox label="Drop-off" /> <CheckBox label="Routine collection" /> <CheckBox label="Ad-hoc" /></div>
                    <p className="font-semibold mt-4">If using collection: Do you pay for this service?</p>
                    <div className="flex gap-4"><CheckBox label="Yes" /> <CheckBox label="No" /></div>
                </QuestionSection>

                <QuestionSection title="Discovery: Shipping Profile">
                    <p className="font-semibold">How many items per week?</p>
                    <div className="flex gap-4"><CheckBox label="<5" /> <CheckBox label="<20" /> <CheckBox label="20-100" /> <CheckBox label="100+" /></div>
                    <p className="font-semibold mt-4">What % of your shipping is Express vs Standard?</p>
                     <div className="flex flex-col gap-2">
                        <CheckBox label="Mostly Standard (>=80%)" />
                        <CheckBox label="Balanced Mix (20-79% Express)" />
                        <CheckBox label="Mostly Express (>=80%)" />
                    </div>
                    <p className="font-semibold mt-4">What is typical size/weight?</p>
                    <div className="grid grid-cols-3 gap-2">
                        {packageTypes.map(item => <CheckBox key={item.id} label={item.label} />)}
                    </div>
                </QuestionSection>

                <QuestionSection title="Discovery: Providers & Tech">
                    <p className="font-semibold">Who do you use for shipping?</p>
                    <div className="grid grid-cols-3 gap-2">
                        {currentProviders.map(item => <CheckBox key={item.id} label={item.label} />)}
                    </div>
                    <p className="font-semibold mt-4">What platform do you use for labels?</p>
                     <div className="grid grid-cols-3 gap-2">
                        {eCommerceTechs.map(item => <CheckBox key={item.id} label={item.label} />)}
                    </div>
                </QuestionSection>

                <QuestionSection title="Discovery: Business Needs">
                    <p className="font-semibold">Do you use same-day couriers?</p>
                    <div className="flex gap-4"><CheckBox label="Yes" /> <CheckBox label="Occasional" /> <CheckBox label="Never" /></div>
                     <p className="font-semibold mt-4">Who decides shipping?</p>
                    <div className="flex gap-4"><CheckBox label="Owner" /> <CheckBox label="Influencer" /> <CheckBox label="Gatekeeper" /></div>
                    <p className="font-semibold mt-4">Pain Points:</p>
                    <div className="border-b border-black h-24 w-full mt-2"></div>
                </QuestionSection>
            </div>
        </div>
    );
});
PrintableCheckInQuestions.displayName = 'PrintableCheckInQuestions';

const QuestionSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="p-4 border border-gray-300 rounded-md mb-4 break-inside-avoid">
        <h2 className="text-lg font-bold mb-4 border-b pb-2">{title}</h2>
        <div className="space-y-4">{children}</div>
    </div>
);

const CheckBox = ({ label }: { label: string }) => (
    <div className="flex items-center gap-2">
        <div className="w-4 h-4 border border-black bg-white"></div>
        <span className="text-sm">{label}</span>
    </div>
);

const TextInputLine = ({ label }: { label: string }) => (
    <div className="flex items-end gap-2 mt-2">
        <label className="text-sm font-semibold whitespace-nowrap w-20">{label}:</label>
        <div className="border-b border-black w-full"></div>
    </div>
);

const ContactInputSet = () => (
    <div className="space-y-2 border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <TextInputLine label="Name" />
            <TextInputLine label="Title" />
            <TextInputLine label="Email" />
            <TextInputLine label="Phone" />
        </div>
    </div>
);
