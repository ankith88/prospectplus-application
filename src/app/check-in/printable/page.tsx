
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

const couriers = ["TGE (upto 5kg)", "StarTrack (upto 5kg)", "TNT (upto 5kg)", "Couriers Please", "Aramex"];
const reasonsToLeave = ["Banking", "Local Same Day"];

const QuestionSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="p-4 border border-gray-300 rounded-md mb-4" style={{ breakInside: 'avoid' }}>
        <h2 className="text-lg font-bold mb-4 border-b pb-2">{title}</h2>
        <div className="space-y-4">{children}</div>
    </div>
);

const CheckBox = ({ label }: { label: string }) => (
    <div className="flex items-center gap-2">
        <div className="w-5 h-5 border-2 border-black bg-white"></div>
        <span className="text-base">{label}</span>
    </div>
);

const TextInputLine = ({ label }: { label: string }) => (
    <div className="flex items-end gap-3 mt-2">
        <label className="text-base font-semibold whitespace-nowrap">{label}:</label>
        <div className="border-b-2 border-black w-full"></div>
    </div>
);

const ContactInputSet = () => (
    <div className="space-y-4 border-t-2 border-gray-200 pt-4 first:border-t-0 first:pt-0">
        <TextInputLine label="Name" />
        <TextInputLine label="Title" />
        <TextInputLine label="Email" />
        <TextInputLine label="Phone" />
    </div>
);

export default function PrintableCheckInPage() {
    return (
        <div className="p-8 bg-white text-black w-[210mm] min-h-[297mm] mx-auto">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold text-center">Check-in Questions</h1>
                <Button onClick={() => window.print()}>Print / Save as PDF</Button>
            </div>
             <div className="hidden print:block text-center mb-6">
                <h1 className="text-2xl font-bold">Check-in Questions</h1>
            </div>

            <div className="space-y-6">
                <QuestionSection title="Company & Contact Details (Steps 1 & 2)">
                    <TextInputLine label="Company Name" />
                    <TextInputLine label="Address" />
                    <ContactInputSet />
                </QuestionSection>

                <QuestionSection title="Australia Post (Step 3)">
                    <p className="font-semibold">Do you have a relationship with Australia Post?</p>
                    <div className="flex gap-8 mt-2"><CheckBox label="Yes" /> <CheckBox label="No" /></div>
                    <p className="font-semibold mt-4">If Yes, what do you use them for?</p>
                    <div className="border-b border-black h-8 w-full mt-2"></div>
                    <p className="font-semibold mt-4">If Yes, do you drop it off or do they come here?</p>
                    <div className="flex gap-8 mt-2"><CheckBox label="Drop-off" /> <CheckBox label="They collect" /></div>
                    <p className="font-semibold mt-4">If Yes, do you pay for the service?</p>
                    <div className="flex gap-8 mt-2"><CheckBox label="Yes" /> <CheckBox label="No" /></div>
                </QuestionSection>

                <QuestionSection title="Other Couriers (Step 4)">
                    <p className="font-semibold">Do you use any other couriers?</p>
                    <div className="flex gap-8 mt-2"><CheckBox label="Yes" /> <CheckBox label="No" /></div>
                    <p className="font-semibold mt-4">If Yes, which Courier do you use?</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">
                        {couriers.map(courier => <CheckBox key={courier} label={courier} />)}
                    </div>
                    <p className="font-semibold mt-4">If Yes, do you have any need for local same-day deliveries?</p>
                    <div className="flex gap-8 mt-2"><CheckBox label="Yes" /> <CheckBox label="No" /></div>
                </QuestionSection>

                <QuestionSection title="Office Errands (Step 5)">
                    <p className="font-semibold">Do people leave the office during the day?</p>
                    <div className="flex gap-8 mt-2"><CheckBox label="Yes" /> <CheckBox label="No" /></div>
                    <p className="font-semibold mt-4">If Yes, what are the reasons?</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">
                        {reasonsToLeave.map(reason => <CheckBox key={reason} label={reason} />)}
                    </div>
                </QuestionSection>
            </div>
        </div>
    );
}
