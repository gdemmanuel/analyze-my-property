import React from 'react';
import { X } from 'lucide-react';

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">Privacy Policy</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 text-sm text-slate-700 space-y-6 leading-relaxed">

          <p className="text-xs text-slate-500">Effective Date: February 22, 2026 &nbsp;·&nbsp; Last Updated: February 22, 2026</p>

          <p>
            Your privacy matters to us. This Privacy Policy explains what data we collect, how we use it, and
            your rights regarding that data when you use Analyze My Property ("the Service").
          </p>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">1. Data We Collect</h3>
            <p className="font-medium text-slate-800 mb-1">Account Data</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 mb-3">
              <li>Email address (required for account creation)</li>
              <li>Password (stored as a secure hash — we never see your plain-text password)</li>
              <li>Account creation date and last login</li>
            </ul>
            <p className="font-medium text-slate-800 mb-1">Usage Data</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 mb-3">
              <li>Property addresses you analyze</li>
              <li>Saved property assessments in your portfolio</li>
              <li>Number of analyses run per day (for rate limiting)</li>
              <li>Subscription tier and billing status</li>
            </ul>
            <p className="font-medium text-slate-800 mb-1">Technical Data</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Browser type and device information (via standard HTTP headers)</li>
              <li>Authentication tokens stored in your browser's localStorage</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">2. How We Use Your Data</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>To create and manage your account</li>
              <li>To deliver property analysis results</li>
              <li>To enforce usage limits by subscription tier</li>
              <li>To send transactional emails (account confirmation, trial notices, billing updates)</li>
              <li>To improve the Service's accuracy and features</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="mt-2">
              We do <strong>not</strong> sell your personal data. We do not use your data for advertising targeting.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">3. Third-Party Services</h3>
            <p className="mb-2">We use the following third-party services to operate the platform:</p>
            <ul className="space-y-2 text-slate-600">
              <li><strong className="text-slate-800">Supabase</strong> — Authentication and database storage. Your account data and saved assessments are stored in Supabase's infrastructure. See their <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#4CAF50] hover:underline">Privacy Policy</a>.</li>
              <li><strong className="text-slate-800">Stripe</strong> — Payment processing. Your payment information (credit card numbers, billing address) is handled directly by Stripe and is never stored on our servers. See their <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#4CAF50] hover:underline">Privacy Policy</a>.</li>
              <li><strong className="text-slate-800">Resend</strong> — Transactional email delivery. Your email address is shared with Resend to send account and billing emails. See their <a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#4CAF50] hover:underline">Privacy Policy</a>.</li>
              <li><strong className="text-slate-800">Anthropic (Claude AI)</strong> — AI-powered property analysis. Property addresses and financial inputs may be sent to Anthropic's API to generate analysis. See their <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#4CAF50] hover:underline">Privacy Policy</a>.</li>
              <li><strong className="text-slate-800">RentCast</strong> — Real estate market data. Property addresses are sent to RentCast's API to retrieve rental comps and market statistics. See their <a href="https://rentcast.io/privacy" target="_blank" rel="noopener noreferrer" className="text-[#4CAF50] hover:underline">Privacy Policy</a>.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">4. Cookies and Local Storage</h3>
            <p>
              We use browser localStorage to store your Supabase authentication session token. This is necessary
              for you to remain logged in between visits. We do not use advertising cookies or third-party tracking
              cookies.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">5. Data Retention</h3>
            <p>
              We retain your account data and saved assessments for as long as your account is active. If you
              delete your account, we will delete your personal data within 30 days, except where retention is
              required by law (e.g., billing records).
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">6. Your Rights</h3>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Access</strong> — Request a copy of the personal data we hold about you</li>
              <li><strong>Correction</strong> — Request correction of inaccurate data</li>
              <li><strong>Deletion</strong> — Request deletion of your account and associated data</li>
              <li><strong>Portability</strong> — Request your saved assessments in a portable format</li>
              <li><strong>Opt-out of emails</strong> — Unsubscribe from marketing emails at any time (transactional emails related to your account cannot be opted out of while your account is active)</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:privacy@analyzemyproperty.com" className="text-[#4CAF50] hover:underline">
                privacy@analyzemyproperty.com
              </a>
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">7. Data Security</h3>
            <p>
              We use industry-standard security practices including encrypted connections (HTTPS), hashed passwords,
              and role-level security on our database. However, no system is 100% secure and we cannot guarantee
              the absolute security of your data.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">8. Children's Privacy</h3>
            <p>
              The Service is not directed to children under 13. We do not knowingly collect personal data from
              anyone under 13. If you believe a child has provided us personal data, contact us and we will
              delete it promptly.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">9. Changes to This Policy</h3>
            <p>
              We may update this Privacy Policy periodically. We will notify you of material changes by email
              or by displaying a notice in the Service. Continued use of the Service after the effective date
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">10. Contact</h3>
            <p>
              Privacy questions? Contact us at{' '}
              <a href="mailto:privacy@analyzemyproperty.com" className="text-[#4CAF50] hover:underline">
                privacy@analyzemyproperty.com
              </a>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
