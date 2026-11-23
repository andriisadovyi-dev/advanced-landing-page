(() => {
  const form = document.querySelector("#package-form");
  if (!form) return;

  const daysInput = document.querySelector("#package-days");
  const daysRange = document.querySelector("#package-days-range");
  const daysError = document.querySelector("#package-days-error");
  const roomInput = document.querySelector("#package-room");
  const foodInput = document.querySelector("#package-food");
  const status = document.querySelector("#package-status");
  const resetButton = document.querySelector("#package-reset");
  const discountInput = document.querySelector("#package-discount");
  const summary = document.querySelector(".package-summary");

  const requiredElements = [
    form,
    daysInput,
    daysRange,
    daysError,
    roomInput,
    foodInput,
    status,
    resetButton,
    discountInput,
    summary
  ];

  if (requiredElements.some((element) => !(element instanceof HTMLElement))) {
    console.error("Package builder setup failed: one or more required elements are missing.");
    return;
  }

  const formatPrice = (value) => {
    if (!Number.isFinite(value)) return "Невизначена вартість";
    return `${Math.round(value).toLocaleString("uk-UA")} грн`;
  };

  const PACKAGE_RATES = Object.freeze({
    days: Object.freeze({ min: 3, max: 7 }),
    discount: 0.1,
    room: Object.freeze([800, 1500, 2500]),
    food: Object.freeze([400, 700]),
    training: Object.freeze([0, 300, 600]),
    extras: Object.freeze([500, 1000, 1200])
  });

  const getDays = () => Number(daysInput.value);

  const parseFiniteRate = (value, allowedValues) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && allowedValues.includes(parsed)
      ? parsed
      : null;
  };

  const isValidDays = () => {
    const days = getDays();
    return Number.isInteger(days)
      && Number.isFinite(days)
      && days >= PACKAGE_RATES.days.min
      && days <= PACKAGE_RATES.days.max;
  };

  const updateDaysValidity = () => {
    const valid = isValidDays();
    daysError.hidden = valid;
    daysInput.setAttribute("aria-invalid", String(!valid));
    form.querySelector(".package-submit").disabled = !valid;

    if (!valid) {
      status.textContent = "Тривалість має бути цілим числом від 3 до 7.";
    }

    return valid;
  };

  const calculatePackage = ({
    days,
    roomPerDay,
    foodPerDay,
    trainingPerDay,
    extras,
    discountEnabled
  }) => {
    const values = [roomPerDay, foodPerDay, trainingPerDay, days];
    const extrasValid = extras.every((extra) =>
      Number.isFinite(extra.value)
      && PACKAGE_RATES.extras.includes(extra.value)
    );

    if (!values.every(Number.isFinite) || !extrasValid) {
      return null;
    }

    const roomCost = roomPerDay * days;
    const foodCost = foodPerDay * days;
    const trainingCost = trainingPerDay * days;
    const extrasCost = extras.reduce((sum, extra) => sum + extra.value, 0);
    const subtotal = roomCost + foodCost + trainingCost + extrasCost;
    const discount = discountEnabled
      ? Math.round(subtotal * PACKAGE_RATES.discount)
      : 0;
    const total = subtotal - discount;

    if (![
      roomCost,
      foodCost,
      trainingCost,
      extrasCost,
      subtotal,
      discount,
      total
    ].every(Number.isFinite)) {
      return null;
    }

    return {
      roomCost,
      foodCost,
      trainingCost,
      extrasCost,
      discount,
      total
    };
  };

  const calculate = () => {
    if (!updateDaysValidity()) return null;

    const days = getDays();
    const roomPerDay = parseFiniteRate(roomInput.value, PACKAGE_RATES.room);
    const foodPerDay = parseFiniteRate(foodInput.value, PACKAGE_RATES.food);
    const selectedTraining = form.querySelector('input[name="training"]:checked');
    const trainingPerDay = parseFiniteRate(
      selectedTraining?.value,
      PACKAGE_RATES.training
    );

    if (roomPerDay === null || foodPerDay === null || trainingPerDay === null) {
      status.textContent = "Перевірте обрані параметри проживання, харчування або тренувань.";
      return null;
    }

    const selectedExtras = Array.from(
      form.querySelectorAll('input[name="extra"]:checked')
    );
    const extras = selectedExtras.map((input) => ({
      label: input.dataset.label,
      value: Number(input.value)
    })).filter((extra) =>
      PACKAGE_RATES.extras.includes(extra.value)
      && typeof extra.label === "string"
      && extra.label.trim() !== ""
    );
    const calculation = calculatePackage({
      days,
      roomPerDay,
      foodPerDay,
      trainingPerDay,
      extras,
      discountEnabled: discountInput.checked
    });

    if (!calculation) {
      status.textContent = "Розрахунок неможливий: перевірте введені значення.";
      return null;
    }

    return {
      days,
      ...calculation,
      extrasLabels: extras.map((extra) => extra.label)
    };
  };

  const render = (calculation) => {
    if (!calculation) return;

    document.querySelector("#package-room-cost").textContent =
      formatPrice(calculation.roomCost);
    document.querySelector("#package-food-cost").textContent =
      formatPrice(calculation.foodCost);
    document.querySelector("#package-training-cost").textContent =
      calculation.trainingCost
        ? formatPrice(calculation.trainingCost)
        : "Без доплати";
    document.querySelector("#package-extra-cost").textContent =
      calculation.extrasCost
        ? calculation.extrasLabels.join(", ")
        : "Не обрано";
    document.querySelector("#package-discount-cost").textContent =
      calculation.discount
        ? `−${formatPrice(calculation.discount)}`
        : "0 грн";
    document.querySelector("#package-total").textContent =
      formatPrice(calculation.total);
  };

  const updateLivePreview = () => {
    if (!updateDaysValidity()) return;

    render(calculate());
    status.textContent = "Попередня сума оновлена.";
  };

  daysInput.addEventListener("input", () => {
    if (isValidDays()) daysRange.value = daysInput.value;
    updateLivePreview();
  });

  daysRange.addEventListener("input", () => {
    daysInput.value = daysRange.value;
    updateLivePreview();
  });

  form.addEventListener("change", updateLivePreview);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const calculation = calculate();

    if (!calculation) {
      daysInput.focus();
      return;
    }

    render(calculation);
    status.textContent =
      `Підсумок на ${calculation.days} днів готовий: ${formatPrice(calculation.total)}.`;
    summary.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  resetButton.addEventListener("click", () => {
    form.reset();
    daysInput.value = "5";
    daysRange.value = "5";
    roomInput.value = "1500";
    foodInput.value = "700";
    updateLivePreview();
    daysInput.focus();
  });

  updateLivePreview();
})();
