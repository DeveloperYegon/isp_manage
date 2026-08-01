"use client"

import Link from "next/dist/client/link";


//footer content goes here
export function Footer() {

    const currentYear = new Date().getFullYear();
  return (
    <>
      {/* Footer */}
      <div className="flex items-center py-6 bg-[black] text-white gap-2 text-sm justify-center">
        &copy; {currentYear} MobileISP | <Link href="https://datanyagency.com" target="_blank" className="underline hover:no-underline">
          Datany Agency
        </Link>
         All rights reserved.
      </div>
    </>
  )
}