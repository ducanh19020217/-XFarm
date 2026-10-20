'use client';

import { useState } from 'react';
import { Send, Mail } from 'lucide-react';

interface ContactFormProps {
  recipientEmail?: string;
}

export function ContactForm({ recipientEmail = 'hello@xfarm.local' }: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const buildMailtoUrl = () => {
    const encodedSubject = encodeURIComponent(
      subject ? `[XFarm Liên Hệ] ${subject}` : `[XFarm Liên Hệ] Thư từ ${name || 'Khách hàng'}`,
    );
    const bodyText = `Họ và tên: ${name}\nEmail: ${email}\nSố điện thoại: ${phone}\n\nNội dung liên hệ:\n${message}`;
    const encodedBody = encodeURIComponent(bodyText);
    return `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = buildMailtoUrl();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface rounded-3xl p-6 sm:p-8 border border-line shadow-xs space-y-5 text-fg"
      aria-label="Form gửi tin nhắn liên hệ"
    >
      <div>
        <label htmlFor="contact-name" className="block text-sm font-semibold text-fg-2 mb-1.5">
          Họ và tên <span className="text-crit">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Nguyễn Văn An"
          className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-fg placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 text-sm outline-hidden transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-email" className="block text-sm font-semibold text-fg-2 mb-1.5">
            Email <span className="text-crit">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-fg placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 text-sm outline-hidden transition-all"
          />
        </div>

        <div>
          <label htmlFor="contact-phone" className="block text-sm font-semibold text-fg-2 mb-1.5">
            Số điện thoại
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0901 234 567"
            className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-fg placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 text-sm outline-hidden transition-all"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="block text-sm font-semibold text-fg-2 mb-1.5">
          Tiêu đề liên hệ
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Hỏi về sản phẩm / Tham quan trải nghiệm"
          className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-fg placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 text-sm outline-hidden transition-all"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-semibold text-fg-2 mb-1.5">
          Nội dung tin nhắn <span className="text-crit">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Vui lòng để lại lời nhắn hoặc yêu cầu của bạn tại đây..."
          className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-fg placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 text-sm outline-hidden transition-all"
        />
      </div>

      <div className="pt-2">
        <a
          href={buildMailtoUrl()}
          onClick={handleSubmit}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-surface font-bold text-sm sm:text-base shadow-sm hover:shadow-md transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Mail className="w-4 h-4" aria-hidden="true" />
          <span>Gửi liên hệ qua Email (mailto)</span>
          <Send className="w-4 h-4 ml-1" aria-hidden="true" />
        </a>
        <p className="text-xs text-muted text-center mt-2.5">
          Nhấn nút trên sẽ mở ứng dụng email mặc định của bạn với nội dung đã điền sẵn.
        </p>
      </div>
    </form>
  );
}
