// src/shortkeys/PopupManager.js

function ensureContainers() {
  let root = document.getElementById("shortkey-popup-container");
  if (!root) {
    root = document.createElement("div");
    root.id = "shortkey-popup-container";
    document.body.appendChild(root);
  }

  const basePopupClasses = [
    // Contenedor visual (Tailwind original)
    "fixed", "z-[2000]", "bg-white", "border", "border-gray-300",
    "rounded-md", "shadow-xl", "text-xs", "text-slate-800",
    "max-h-48", "overflow-y-auto", "min-w-[240px]", "max-w-[380px]",
    "opacity-0", "invisible", "transform", "transition",
    "duration-150", "ease-out", "scale-95", "-translate-y-2"
  ].join(" ");

  if (!document.getElementById("shortkey-search-popup")) {
    const a = document.createElement("div");
    a.id = "shortkey-search-popup";
    a.className = basePopupClasses;
    root.appendChild(a);
  }
  if (!document.getElementById("shortkey-interaction-popup")) {
    const b = document.createElement("div");
    b.id = "shortkey-interaction-popup";
    b.className = basePopupClasses;
    root.appendChild(b);
  }
}

function optionButtonHTML({ type, item, index }) {
  // Botón base (grid: @key + descripción/preview) — MISMO layout/estilo
  const baseBtn =
    "w-full grid grid-cols-[auto_1fr] gap-2 items-center px-2.5 py-1.5 text-left cursor-pointer " +
    "hover:bg-gray-100 focus:outline-none";

  if (type === "search") {
    return `
      <button class="popup-option ${baseBtn}" data-index="${index}" data-key="${item.key}">
        <span class="search-key font-mono font-semibold text-blue-700 bg-blue-100 border border-blue-200 rounded px-1">
          @${item.key}
        </span>
        <!-- Antes: truncate. Ahora: multilínea, mismo color/tamaño; ancho ya está limitado por el popup -->
        <span class="search-desc text-gray-600 whitespace-normal break-words" style="text-align:justify;">
          ${item.preview || item.description || ""}
        </span>
      </button>
    `;
  }
  // interacción: item = {label, value, nextStep}
  return `
    <button class="popup-option ${baseBtn}" data-index="${index}">
      <span class="interaction-label font-mono font-semibold text-blue-700 bg-blue-100 border border-blue-200 rounded px-1">
        ${item.label ?? ""}
      </span>
      <!-- Antes: truncate. Ahora: multilínea + justificado, conservando estilo -->
      <span class="interaction-value text-gray-600 whitespace-normal break-words" style="text-align:justify;">
        ${item.value ?? ""}
      </span>
    </button>
  `;
}

export default class PopupManager {
  // Agrego onCancel opcional (igual que original que enviaste)
  constructor(element, onSelect, onCancel = null) {
    this.element = element;
    this.onSelect = onSelect;
    this.onCancel = onCancel;

    this.popup = null;
    this.items = [];
    this.selectedIndex = -1;

    this._boundHandleKeydown = this._handleKeydown.bind(this);
    this._boundHandleClick = this._handleClick.bind(this);
    this._boundDocClick = this._handleDocClick.bind(this);
    this._boundReposition = this._reposition.bind(this);

    this._listening = false;

    // Evita doble confirmación: Enter/Espacio (teclado) → click fantasma
    this._suppressClicksUntil = 0;
    this._cancelNotified = false;
  }

  show(items, type, prompt = null) {
    ensureContainers();
    this.items = items || [];
    this.selectedIndex = 0;

    this.popup = document.getElementById(
      type === "search" ? "shortkey-search-popup" : "shortkey-interaction-popup"
    );
    if (!this.popup) return;

    // Contenido (Tailwind original)
    const promptHTML = prompt
      ? `<div class="px-3 py-2 border-b border-gray-200 text-gray-700 font-semibold text-xs">${prompt}</div>`
      : "";

    const optsHTML = (this.items || [])
      .map((it, idx) => optionButtonHTML({ type, item: it, index: idx }))
      .join("");

    this.popup.innerHTML = promptHTML + optsHTML;

    // Por si acaso (mantener sin scroll horizontal)
    this.popup.style.overflowX = "hidden";

    // Posicionar y mostrar (flotante con fixed)
    this._positionAtCaretOrElement();

    // Mostrar con transición (mismas clases)
    this.popup.classList.remove("opacity-0", "invisible", "scale-95", "-translate-y-2");
    this.popup.classList.add("opacity-100", "visible", "scale-100", "translate-y-0");

    // Listeners (evita duplicados cuando se re-muestra para el siguiente paso)
    this._detachListeners();
    this._attachListeners();

    // Selección inicial
    this._updateSelection();

    // === (1) Altura dinámica: mostrar TODO si cabe; si no, limitar a viewport ===
    this._applyDynamicHeight();
  }

  destroy(reason = "normal") {
    if (!this.popup) {
      this._detachListeners();
      return;
    }
    this.popup.classList.add("opacity-0", "invisible", "scale-95", "-translate-y-2");
    setTimeout(() => {
      if (this.popup) {
        this.popup.innerHTML = "";
        // No quitamos clases ni estilos base
        this.popup = null;
      }
      this._detachListeners();

      // Notifica cancelación SOLO si fue cancel (Esc o clic fuera)
      if (reason === "cancel" && this.onCancel && !this._cancelNotified) {
        this._cancelNotified = true;
        try { this.onCancel(); } catch {}
      }
    }, 100);
  }

  _attachListeners() {
    if (this._listening) return;
    document.addEventListener("keydown", this._boundHandleKeydown, true);
    this.popup?.addEventListener("click", this._boundHandleClick, true);
    setTimeout(() => document.addEventListener("click", this._boundDocClick, true), 0);
    window.addEventListener("resize", this._boundReposition, true);
    window.addEventListener("scroll", this._boundReposition, true);
    this._listening = true;
  }

  _detachListeners() {
    if (!this._listening) return;
    document.removeEventListener("keydown", this._boundHandleKeydown, true);
    document.removeEventListener("click", this._boundDocClick, true);
    window.removeEventListener("resize", this._boundReposition, true);
    window.removeEventListener("scroll", this._boundReposition, true);
    this.popup?.removeEventListener("click", this._boundHandleClick, true);
    this._listening = false;
  }

  _handleKeydown(e) {
    if (!this.popup) return;

    // === (2) Navegación infinita con flechas (wrap-around) ===
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const n = this.items.length;
      if (n > 0) this.selectedIndex = (this.selectedIndex + 1 + n) % n;
      this._updateSelection(true);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const n = this.items.length;
      if (n > 0) this.selectedIndex = (this.selectedIndex - 1 + n) % n;
      this._updateSelection(true);
      return;
    }

    // Enter / Tab / Espacio confirman la opción
    if (e.key === "Enter" || e.key === "Tab" || e.key === " " || e.code === "Space" || e.keyCode === 32) {
      e.preventDefault();
      const item = this.items[this.selectedIndex];
      if (item) {
        const cb = this.onSelect;
        this._suppressClicksUntil = Date.now() + 200; // suprime click fantasma
        cb && cb(item);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      this.destroy("cancel");
    }
  }

  _handleClick(e) {
    // ¿Venimos de una confirmación por teclado? Ignora este click fantasma
    if (Date.now() < this._suppressClicksUntil) {
      e.preventDefault();
      return;
    }

    const btn = e.target.closest(".popup-option");
    if (!btn) return;
    const idx = Number(btn.getAttribute("data-index") || "0");
    const item = this.items[idx];
    if (item) {
      const cb = this.onSelect;
      cb && cb(item);
    }
  }

  _handleDocClick(e) {
    if (!this.popup) return;
    if (!this.popup.contains(e.target)) {
      this.destroy("cancel");
    }
  }

  _positionAtCaretOrElement() {
    const el = this.element;
    if (!el) return;

    // Preferimos posicionar cerca del caret de un textarea/input
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      const coords = this._positionNearElementCaret(el); // {left, top, caret...}
      this._placeWithinViewport(coords);
      return;
    }

    // Fallback: junto al elemento
    const r = el.getBoundingClientRect();
    const coords = {
      left: r.left,
      top: r.bottom + 6,
      caretLeft: r.left,
      caretRight: r.right,
      caretTop: r.top,
      caretBottom: r.bottom,
    };
    this._placeWithinViewport(coords);
  }

  _getPopupSize() {
    // Mide el tamaño actual del popup (aún invisible pero con layout)
    const prevLeft = this.popup.style.left;
    const prevTop = this.popup.style.top;
    this.popup.style.left = "0px";
    this.popup.style.top = "0px";
    const rect = this.popup.getBoundingClientRect();
    this.popup.style.left = prevLeft;
    this.popup.style.top = prevTop;
    return { width: rect.width || 280, height: rect.height || 0 };
  }

  _placeWithinViewport(coords) {
    const margin = 8;
    const { width: pw, height: ph } = this._getPopupSize();

    // Posición por defecto: a la DERECHA del caret y DEBAJO
    let left = coords.left;
    let top = coords.top;

    // Si se sale por la derecha, invierte: colócalo a la IZQUIERDA del caret
    if (left + pw > window.innerWidth - margin) {
      left = coords.left - pw;
    }

    // Si queda muy a la izquierda, clampa
    if (left < margin) left = margin;

    // Si se sale por abajo, súbelo encima del caret
    if (top + ph > window.innerHeight - margin) {
      const above = (coords.caretTop ?? (top - 6)) - ph - 6;
      top = Math.max(margin, above);
    }

    // Clampa vertical si quedó fuera por cualquier razón
    if (top < margin) top = margin;

    this.popup.style.left = `${left}px`;
    this.popup.style.top = `${top}px`;
    // Limitar a viewport horizontal, manteniendo tu max-w-[380px]
    this.popup.style.maxWidth = "calc(100vw - 16px)";
  }

  _positionNearElementCaret(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    // --- Espejo del textarea/input para calcular rect del caret ---
    const mirror = document.createElement("div");

    const props = [
      "fontSize","fontFamily","fontWeight","fontStyle","lineHeight","letterSpacing",
      "textTransform","textAlign","direction","tabSize",
      "paddingTop","paddingRight","paddingBottom","paddingLeft",
      "borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth",
      "boxSizing","whiteSpace","wordBreak","overflowWrap"
    ];
    mirror.style.position = "fixed";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.whiteSpace = "pre-wrap"; // multiline
    mirror.style.wordBreak = "break-word";
    mirror.style.overflowWrap = "anywhere";
    mirror.style.background = "transparent";

    mirror.style.boxSizing = style.boxSizing || "border-box";
    props.forEach(p => {
      const v = style[p];
      if (v) mirror.style[p] = v;
    });

    mirror.style.width = rect.width + "px";

    // Ajuste por scroll interno
    const scrollTop = el.scrollTop || 0;
    const scrollLeft = el.scrollLeft || 0;
    mirror.style.left = rect.left - scrollLeft + "px";
    mirror.style.top  = rect.top  - scrollTop  + "px";

    // Contenido hasta el caret
    const before = (el.value || "").slice(0, el.selectionStart || 0);
    mirror.textContent = before;

    // Marcador de caret
    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    mirror.appendChild(marker);

    document.body.appendChild(mirror);

    const mrect = marker.getBoundingClientRect();
    document.body.removeChild(mirror);

    const left = Math.min(window.innerWidth - 12, Math.max(8, mrect.left));
    const top = Math.min(window.innerHeight - 12, Math.max(8, mrect.bottom + 6));

    return {
      left,
      top,
      caretLeft: mrect.left,
      caretRight: mrect.right,
      caretTop: mrect.top,
      caretBottom: mrect.bottom,
    };
  }

  _reposition() {
    if (!this.popup) return;
    this._positionAtCaretOrElement();
  }

  _updateSelection(scrollIntoView = false) {
    if (!this.popup) return;
    const opts = Array.from(this.popup.querySelectorAll(".popup-option"));
    opts.forEach((opt, idx) => {
      const isSel = idx === this.selectedIndex;
      opt.classList.toggle("bg-blue-600", isSel);
      opt.classList.toggle("text-white", isSel);
      opt.classList.toggle("bg-transparent", !isSel);

      const keyEl = opt.querySelector(".search-key, .interaction-label");
      if (keyEl) {
        keyEl.classList.toggle("text-white", isSel);
        keyEl.classList.toggle("bg-blue-500", isSel);
        keyEl.classList.toggle("border-blue-600", isSel);
      }

      const desc = opt.querySelector(".search-desc, .interaction-value");
      if (desc) {
        // Conservamos colores; ahora es multilínea (sin truncate)
        desc.classList.toggle("text-gray-600", !isSel);
        desc.classList.toggle("text-white", isSel);
        // Asegura que no queden restos de 'truncate' por reusos
        desc.classList.remove("truncate");
      }

      if (isSel && scrollIntoView) {
        opt.scrollIntoView({ block: "nearest" });
      }
    });
  }

  // === (1) Lógica de altura dinámica: sin scroll si cabe; si no cabe, limita a viewport ===
  _applyDynamicHeight() {
    if (!this.popup) return;

    // Overwrite por ENCIMA de Tailwind max-h-48/overflow-y-auto solo cuando se necesita
    // Primero medimos con altura libre
    const prevMaxH = this.popup.style.maxHeight;
    const prevOverflowY = this.popup.style.overflowY;

    this.popup.style.maxHeight = "none";
    this.popup.style.overflowY = "visible";

    // Forzamos reflow para obtener altura real
    const rect = this.popup.getBoundingClientRect();
    const fullHeight = rect.height;

    const margin = 8;
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const maxAllow = vh - margin * 2;

    if (fullHeight > maxAllow) {
      // Si no cabe, activamos scroll interno y limitamos a viewport
      this.popup.style.maxHeight = `${maxAllow}px`;
      this.popup.style.overflowY = "auto";
    } else {
      // Si cabe completo, lo mostramos completo sin scroll
      this.popup.style.maxHeight = "none";
      this.popup.style.overflowY = "visible";
    }

    // Reposicionamos por si el cambio de altura afecta la colocación
    this._reposition();

    // Nota: no restauramos prevMaxH/prevOverflowY; mantener estos overrides
    // nos da el comportamiento deseado mientras el popup está visible.
  }
}
