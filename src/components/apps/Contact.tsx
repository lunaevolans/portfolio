import { useState } from 'preact/hooks';
import { site } from '../../config/site';
import { toast } from '../../lib/stores';
import { Icon } from '../Icon';

type Status = 'idle' | 'sending' | 'sent' | 'error';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** neomutt-flavoured compose screen backed by Web3Forms (mailto: fallback). */
export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', botcheck: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
  const configured = !site.web3formsKey.startsWith('YOUR_');

  const set = (k: keyof typeof form) => (e: Event) => setForm({ ...form, [k]: (e.target as HTMLInputElement).value });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'required';
    if (!EMAIL_RE.test(form.email)) e.email = 'needs a valid address';
    if (form.message.trim().length < 10) e.message = 'at least 10 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    if (form.botcheck) return;
    if (!validate()) return;
    const subject = form.subject.trim() || `Hello from ${form.name}`;
    if (!configured) {
      location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${form.message}\n\n— ${form.name} <${form.email}>`)}`;
      setStatus('sent');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: site.web3formsKey, subject, from_name: form.name, email: form.email, message: form.message }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !json.success) throw new Error(json.message ?? `HTTP ${res.status}`);
      setStatus('sent');
      toast('Message sent', 'Thanks! I usually reply within a day or two.', 'ok');
    } catch (err) {
      setStatus('error');
      toast('Send failed', err instanceof Error ? err.message : String(err), 'err');
    }
  };

  if (status === 'sent')
    return (
      <div class="app mutt pad mono">
        <p class="ok">✓ Mail sent.</p>
        <p class="muted">
          {configured
            ? 'It is in my inbox now. I will get back to you soon.'
            : 'Your mail client should have opened with the message ready to send.'}
        </p>
        <button
          type="button"
          class="btn"
          onClick={() => (setForm({ name: '', email: '', subject: '', message: '', botcheck: '' }), setStatus('idle'))}
        >
          compose another
        </button>
      </div>
    );

  return (
    <form class="app mutt mono" onSubmit={submit} noValidate aria-label="Contact form">
      <div class="mutt-bar">
        <span>
          <b>y</b>:Send
        </span>
        <span>
          <b>q</b>:Abort
        </span>
        <span>
          <b>a</b>:Attach
        </span>
        <span class="muted">-- neomutt: Compose</span>
      </div>
      <div class="mutt-headers">
        <label class="mutt-row">
          <span>From:</span>
          <input
            value={form.name}
            onInput={set('name')}
            placeholder="Your name"
            autocomplete="name"
            aria-invalid={!!errors.name}
            aria-describedby="err-name"
            required
          />
        </label>
        {errors.name && (
          <p class="mutt-err" id="err-name">
            name: {errors.name}
          </p>
        )}
        <label class="mutt-row">
          <span>Reply-To:</span>
          <input
            type="email"
            value={form.email}
            onInput={set('email')}
            placeholder="you@example.com"
            autocomplete="email"
            aria-invalid={!!errors.email}
            aria-describedby="err-email"
            required
          />
        </label>
        {errors.email && (
          <p class="mutt-err" id="err-email">
            email: {errors.email}
          </p>
        )}
        <p class="mutt-row static">
          <span>To:</span>
          <b>
            {site.name} &lt;{site.email}&gt;
          </b>
        </p>
        <label class="mutt-row">
          <span>Subject:</span>
          <input value={form.subject} onInput={set('subject')} placeholder="Let's build something" />
        </label>
        <input
          class="hp"
          tabIndex={-1}
          autocomplete="off"
          value={form.botcheck}
          onInput={set('botcheck')}
          aria-hidden="true"
          name="botcheck"
        />
      </div>
      <label class="sr-only" for="mutt-body">
        Message
      </label>
      <textarea
        id="mutt-body"
        class="mutt-body"
        value={form.message}
        onInput={set('message')}
        placeholder={'Hi Luna,\n\n…'}
        aria-invalid={!!errors.message}
        aria-describedby="err-msg"
        required
      />
      {errors.message && (
        <p class="mutt-err" id="err-msg">
          message: {errors.message}
        </p>
      )}
      <div class="mutt-foot">
        <div class="mutt-links">
          {site.links.map((l) => (
            <a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener" class="chip">
              <Icon name={l.icon} size={12} /> {l.label}
            </a>
          ))}
        </div>
        <button type="submit" class="btn primary" disabled={status === 'sending'}>
          <Icon name="mail" /> {status === 'sending' ? 'sending…' : 'Send (y)'}
        </button>
      </div>
    </form>
  );
}
