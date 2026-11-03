// Accessible form validation.
// On submit: every invalid field gets aria-invalid="true" and an inline message that is
// already wired up through aria-describedby. An error summary listing every problem
// (as links to the fields) receives focus, so keyboard and screen reader users land on it.

/** Pure validation rules, exported so they can be unit tested without a DOM. */
export function validate({ fullName = '', email = '', password = '' }) {
  const errors = {};
  if (!fullName.trim()) errors.fullName = 'Enter your full name';
  if (!email.trim()) {
    errors.email = 'Enter your email address';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter an email address in the format name@example.com';
  }
  if (!password) {
    errors.password = 'Enter a password';
  } else if (password.length < 12) {
    errors.password = 'Password must be at least 12 characters';
  }
  return errors;
}

/** @param {HTMLFormElement} form */
export function setupForm(form, summary, list, status) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const errors = validate(data);

    // Reset every field before applying the new result.
    for (const input of form.querySelectorAll('input')) {
      input.removeAttribute('aria-invalid');
      const message = document.getElementById(`${input.id}-error`);
      if (message) message.textContent = '';
    }
    list.replaceChildren();
    status.textContent = '';
    document.title = document.title.replace(/^Error: /, '');

    const invalid = Object.keys(errors);
    if (invalid.length === 0) {
      summary.hidden = true;
      form.reset();
      status.innerHTML = '<p class="success">Account created. Check your inbox to confirm your email.</p>';
      return;
    }

    for (const name of invalid) {
      const input = form.elements.namedItem(name);
      input.setAttribute('aria-invalid', 'true');
      // Prefix with "Error:" so the meaning does not rely on colour alone (WCAG 1.4.1).
      document.getElementById(`${input.id}-error`).textContent = `Error: ${errors[name]}`;

      const link = document.createElement('a');
      link.href = `#${input.id}`;
      link.textContent = errors[name];
      link.addEventListener('click', (e) => {
        e.preventDefault();
        input.focus();
      });
      const item = document.createElement('li');
      item.append(link);
      list.append(item);
    }

    document.title = `Error: ${document.title}`;
    summary.hidden = false;
    summary.focus();
  });
}

const form = document.getElementById('signup');
if (form) {
  setupForm(
    form,
    document.getElementById('error-summary'),
    document.getElementById('error-list'),
    document.getElementById('form-status'),
  );
}
