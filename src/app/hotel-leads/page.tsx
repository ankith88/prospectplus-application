"use client";

import React, { useEffect, useRef } from "react";
import Head from "next/head";
import { useJsApiLoader } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

export default function HotelLeadsForm() {
  const streetInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  useEffect(() => {
    if (isLoaded && streetInputRef.current && !autocompleteRef.current && window.google) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(streetInputRef.current, {
        types: ["address"],
        componentRestrictions: { country: "au" },
      });

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.address_components) return;

        const street_number = place.address_components.find(c => c.types.includes("street_number"))?.long_name || "";
        const route = place.address_components.find(c => c.types.includes("route"))?.long_name || "";
        const city = place.address_components.find(c => c.types.includes("locality"))?.long_name || "";
        const state = place.address_components.find(c => c.types.includes("administrative_area_level_1"))?.short_name || "";
        const zip = place.address_components.find(c => c.types.includes("postal_code"))?.long_name || "";

        if (streetInputRef.current) streetInputRef.current.value = `${street_number} ${route}`.trim();
        const cityEl = document.getElementById("city") as HTMLInputElement;
        if (cityEl) cityEl.value = city;
        const stateEl = document.getElementById("state") as HTMLInputElement;
        if (stateEl) stateEl.value = state;
        const zipEl = document.getElementById("zip") as HTMLInputElement;
        if (zipEl) zipEl.value = zip;
      });
    }
  }, [isLoaded]);

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#041A5C] font-sans">
      {/* Header */}
      <header className="bg-[#041A5C] text-white py-4 px-8 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-wide uppercase">Dashback</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg p-8 sm:p-10 border border-gray-100">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Hotel Leads</h1>
            <p className="text-gray-500">Please enter the details of the hotel lead below.</p>
          </div>

          <form
            action="https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00D5g00000A4z7j"
            method="POST"
            className="space-y-6"
          >
            <input type="hidden" name="oid" value="00D5g00000A4z7j" />
            <input type="hidden" name="retURL" value="https://www.dashback.com.au/" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="relative">
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  maxLength={40}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="First Name"
                  required
                />
                <label
                  htmlFor="first_name"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  First Name
                </label>
              </div>

              {/* Last Name */}
              <div className="relative">
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  maxLength={80}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="Last Name"
                  required
                />
                <label
                  htmlFor="last_name"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  Last Name
                </label>
              </div>

              {/* Email */}
              <div className="relative sm:col-span-2">
                <input
                  type="email"
                  id="email"
                  name="email"
                  maxLength={80}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="Email"
                  required
                />
                <label
                  htmlFor="email"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  Email
                </label>
              </div>

              {/* Title */}
              <div className="relative">
                <input
                  type="text"
                  id="title"
                  name="title"
                  maxLength={40}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="Title"
                />
                <label
                  htmlFor="title"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  Title
                </label>
              </div>

              {/* Company */}
              <div className="relative">
                <input
                  type="text"
                  id="company"
                  name="company"
                  maxLength={40}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="Company"
                  required
                />
                <label
                  htmlFor="company"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  Company
                </label>
              </div>

              {/* Phone */}
              <div className="relative">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  maxLength={40}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="Phone"
                />
                <label
                  htmlFor="phone"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  Phone
                </label>
              </div>

              {/* Mobile */}
              <div className="relative">
                <input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  maxLength={40}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="Mobile"
                />
                <label
                  htmlFor="mobile"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  Mobile
                </label>
              </div>

              {/* Street */}
              <div className="relative sm:col-span-2">
                <input
                  type="text"
                  id="street"
                  name="street"
                  ref={streetInputRef}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="Street"
                />
                <label
                  htmlFor="street"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  Street
                </label>
              </div>

              {/* City */}
              <div className="relative">
                <input
                  type="text"
                  id="city"
                  name="city"
                  maxLength={40}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="City"
                />
                <label
                  htmlFor="city"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  City
                </label>
              </div>

              {/* State */}
              <div className="relative">
                <input
                  type="text"
                  id="state"
                  name="state"
                  maxLength={20}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="State/Province"
                />
                <label
                  htmlFor="state"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  State/Province
                </label>
              </div>

              {/* Zip */}
              <div className="relative">
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  maxLength={20}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C]"
                  placeholder="Zip"
                />
                <label
                  htmlFor="zip"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  Zip
                </label>
              </div>

              {/* Description */}
              <div className="relative sm:col-span-2">
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className="peer block w-full px-4 py-3 bg-transparent border border-gray-300 rounded-md text-sm shadow-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#041A5C] focus:border-[#041A5C] resize-none"
                  placeholder="Description"
                ></textarea>
                <label
                  htmlFor="description"
                  className="absolute left-3 -top-2.5 bg-white px-1 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#041A5C]"
                >
                  Description
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <button
                type="submit"
                name="submit"
                className="w-full sm:w-auto px-8 py-3 bg-[#FABE00] hover:bg-[#e0ab00] text-[#041A5C] font-bold rounded shadow transition-colors uppercase tracking-wider"
              >
                Submit Lead
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
