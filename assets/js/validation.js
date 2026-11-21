(() => {
  const getElementByIds = (...ids) => {
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) return element;
    }
    return null;
  };

  const form = getElementByIds("feedbackForm", "contact-form");
  if (!(form instanceof HTMLFormElement)) {
    console.error("Validation setup failed: feedback form was not found.");
    return;
  }

  const fields = {
    name: getElementByIds("username", "contact-name"),
    email: getElementByIds("email", "contact-email"),
    phone: getElementByIds("phone", "contact-phone"),
    message: getElementByIds("message", "contact-message"),
    agreement: getElementByIds("agreement", "contact-consent")
  };

  const missingFields = Object.entries(fields)
    .filter(([, field]) => !field)
    .map(([name]) => name);

  if (missingFields.length > 0) {
    console.error(`Validation setup failed: missing fields: ${missingFields.join(", ")}.`);
    return;
  }

  const successModal = document.getElementById("success-modal");
  const dialog = successModal?.querySelector("[role='dialog']");
  const closeButtons = successModal
    ? Array.from(successModal.querySelectorAll("[data-close-success-modal]"))
    : [];

  if (!successModal || !dialog || closeButtons.length === 0) {
    console.error("Validation setup failed: accessible success modal is incomplete.");
    return;
  }

  const errorMessages = {
    name: "Введіть ім’я (від 2 до 80 символів).",
    email: "Введіть коректну адресу електронної пошти.",
    phone: "Введіть номер у форматі +380XXXXXXXXX: після +380 має бути рівно 9 цифр, без пробілів чи інших символів.",
    message: "Повідомлення має містити від 10 до 2000 символів.",
    agreement: "Підтвердьте згоду на обробку персональних даних."
  };

  // The number must contain only +380 followed by exactly nine digits.
  const phonePattern = /^\+380\d{9}$/;

  const getMessageElement = (field, state) => {
    const suffix = state === "error" ? "error" : "success";
    const message = getElementByIds(
      `${field.id}-${suffix}`,
      `${field.id}${suffix[0].toUpperCase()}${suffix.slice(1)}`
    );
    if (message && form.contains(message)) return message;

    if (suffix === "error" && field.nextElementSibling?.tagName === "P") {
      return field.nextElementSibling;
    }
    return null;
  };

  const baseDescriptions = new Map(
    Object.values(fields).map((field) => {
      const stateMessageIds = ["error", "success"]
        .map((state) => getMessageElement(field, state))
        .filter(Boolean)
        .map((message) => message.id);
      const descriptions = (field.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter((id) => id && !stateMessageIds.includes(id));
      return [field, descriptions];
    })
  );

  function updateDescription(field, state) {
    const descriptions = [...baseDescriptions.get(field)];
    if (state === "error") {
      const errorMessage = getMessageElement(field, "error");
      if (errorMessage?.id) descriptions.push(errorMessage.id);
    }

    if (descriptions.length > 0) {
      field.setAttribute("aria-describedby", descriptions.join(" "));
    } else {
      field.removeAttribute("aria-describedby");
    }
  }

  function clearError(field) {
    field.removeAttribute("aria-invalid");
    field.classList.remove("border-red-500", "border-green-500");
    updateDescription(field);

    ["error", "success"].forEach((state) => {
      const message = getMessageElement(field, state);
      if (message) {
        message.classList.add("hidden");
        message.classList.remove("block", "flex");
      }
    });
  }

  function showError(field, key) {
    if (field.getAttribute("aria-invalid") !== "true") clearError(field);
    field.setAttribute("aria-invalid", "true");
    field.classList.add("border-red-500");

    const message = getMessageElement(field, "error");
    if (message) {
      if (message.textContent !== errorMessages[key]) {
        message.textContent = errorMessages[key];
      }
      message.classList.remove("hidden");
      message.classList.add("block");
    }
    updateDescription(field, "error");
  }

  function showSuccess(field) {
    if (field.getAttribute("aria-invalid") !== "false") clearError(field);
    field.setAttribute("aria-invalid", "false");
    field.classList.add("border-green-500");

    const message = getMessageElement(field, "success");
    if (message) {
      message.classList.remove("hidden");
      message.classList.add("flex");
    }
    updateDescription(field);
  }

  function validateName() {
    const value = fields.name.value.trim();
    const valid = value.length >= 2 && value.length <= 80;
    if (valid) showSuccess(fields.name);
    else showError(fields.name, "name");
    return valid;
  }

  function validateEmail() {
    const valid = fields.email.value.trim() !== "" && fields.email.validity.valid;
    if (valid) showSuccess(fields.email);
    else showError(fields.email, "email");
    return valid;
  }

  function validatePhone() {
    const valid = phonePattern.test(fields.phone.value);
    if (valid) showSuccess(fields.phone);
    else showError(fields.phone, "phone");
    return valid;
  }

  function validateMessage() {
    const length = fields.message.value.trim().length;
    const valid = length >= 10 && length <= 2000;
    if (valid) showSuccess(fields.message);
    else showError(fields.message, "message");
    return valid;
  }

  function validateAgreement() {
    const valid = fields.agreement.checked;
    if (valid) showSuccess(fields.agreement);
    else showError(fields.agreement, "agreement");
    return valid;
  }

  const validators = [
    { field: fields.name, validate: validateName },
    { field: fields.email, validate: validateEmail },
    { field: fields.phone, validate: validatePhone },
    { field: fields.message, validate: validateMessage },
    { field: fields.agreement, validate: validateAgreement }
  ];

  const backgroundElements = Array.from(document.body.children)
    .filter((element) => element !== successModal && element.tagName !== "SCRIPT");
  const previousInertStates = new Map(
    backgroundElements.map((element) => [element, element.inert])
  );
  let modalTrigger = null;
  let previousBodyOverflow = "";

  function openSuccessModal() {
    if (!successModal.classList.contains("hidden")) return;

    const activeElement = document.activeElement;
    modalTrigger = activeElement instanceof HTMLElement && form.contains(activeElement)
      ? activeElement
      : form.querySelector("button[type='submit']");
    previousBodyOverflow = document.body.style.overflow;

    backgroundElements.forEach((element) => {
      element.inert = true;
    });
    document.body.style.overflow = "hidden";
    successModal.classList.remove("hidden");
    successModal.classList.add("flex");
    successModal.setAttribute("aria-hidden", "false");
    closeButtons[0].focus();
  }

  function closeSuccessModal() {
    if (successModal.classList.contains("hidden")) return;

    successModal.classList.add("hidden");
    successModal.classList.remove("flex");
    successModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousBodyOverflow;
    previousInertStates.forEach((wasInert, element) => {
      element.inert = wasInert;
    });

    if (modalTrigger?.isConnected) modalTrigger.focus();
    modalTrigger = null;
  }

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeSuccessModal);
  });

  successModal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSuccessModal();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = Array.from(dialog.querySelectorAll(
      "button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"
    ));
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (focusableElements.length === 0) {
      event.preventDefault();
      dialog.focus();
    } else if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });

  validators.forEach(({ field, validate }) => {
    field.addEventListener("blur", () => {
      validate();
    });

    field.addEventListener(field.type === "checkbox" ? "change" : "input", () => {
      validate();
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const results = validators.map(({ validate }) => validate());
    const firstInvalidIndex = results.findIndex((valid) => !valid);
    const status = form.querySelector("#contact-status, [role='status']");

    if (firstInvalidIndex !== -1) {
      if (status) {
        status.textContent = "Будь ласка, перевірте поля, позначені помилкою.";
        status.classList.add("contact-status-warning");
      }
      validators[firstInvalidIndex].field.focus();
      return;
    }

    if (status) {
      status.textContent = "Перевірку пройдено. Сервіс надсилання ще не підключений, дані не передано.";
      status.classList.add("contact-status-warning");
    }
    openSuccessModal();
  });
})();
