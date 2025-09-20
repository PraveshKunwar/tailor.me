"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X, LogIn } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-3"
          >
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative w-10 h-10">
                <Image
                  src="/logo.png"
                  alt="Tailor.me Logo"
                  width={40}
                  height={40}
                  className="transition-transform duration-200 group-hover:scale-105"
                />
              </div>
              <span className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                Tailor.me
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/#features"
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
            >
              How It Works
            </Link>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/login"
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
            <Link href="/login" className="btn-primary">
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors duration-200"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <motion.div
          initial={false}
          animate={
            isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }
          }
          transition={{ duration: 0.3 }}
          className="md:hidden overflow-hidden"
        >
          <div className="py-4 space-y-4 border-t border-gray-100">
            <Link
              href="/#features"
              className="block text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="block text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
              onClick={() => setIsOpen(false)}
            >
              How It Works
            </Link>
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <Link
                href="/login"
                className="block text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="btn-primary block text-center"
                onClick={() => setIsOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
