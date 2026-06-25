import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

function ContactUs() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
    // Optionally reset form
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <section className="relative py-20 text-white" id="contact">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Contact Us
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Have questions or need support? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-10">
              <h3 className="text-2xl font-semibold mb-6">Get in Touch</h3>
              <div className="space-y-10">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">Email</h4>
                    <p className="text-gray-400">support@mentorx.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">Phone</h4>
                    <p className="text-gray-400">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">Address</h4>
                    <p className="text-gray-400">123 Learning Street<br />Education City, ED 12345</p>
                  </div>
                </div>
              </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-colors text-white placeholder-gray-400"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-colors text-white placeholder-gray-400"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-colors text-white placeholder-gray-400 resize-none"
                  placeholder="Tell us how we can help you..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-gray-200 transition-colors duration-300 flex items-center justify-center space-x-2"
              >
                <Send className="h-5 w-5" />
                <span>Send Message</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactUs;
