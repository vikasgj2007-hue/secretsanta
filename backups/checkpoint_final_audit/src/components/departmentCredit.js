/* ==========================================================================
   GLOBAL DEPARTMENT CREDIT COMPONENT
   Subtle, elegant university department credit anchored to bottom-right corner.
   Exact text: "Department of Computer Science"
   ========================================================================== */

export const DEPARTMENT_CREDIT_TEXT = 'Department of Computer Science';

export function initDepartmentCredit() {
  let creditEl = document.getElementById('department-credit');
  if (!creditEl) {
    creditEl = document.createElement('aside');
    creditEl.id = 'department-credit';
    creditEl.className = 'department-credit';
    creditEl.setAttribute('aria-label', 'Department of Computer Science');
    creditEl.innerHTML = `<span class="department-credit-text">${DEPARTMENT_CREDIT_TEXT}</span>`;

    const appEl = document.getElementById('app') || document.body;
    appEl.appendChild(creditEl);
  }
  return creditEl;
}

