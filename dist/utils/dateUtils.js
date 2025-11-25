"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateToInput = exports.addDays = void 0;
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
exports.addDays = addDays;
const formatDateToInput = (date) => {
    if (!date)
        return null;
    const d = new Date(date);
    // Garante UTC para evitar problemas de fuso horário
    const dataCorrigida = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return dataCorrigida.toISOString().split('T')[0];
};
exports.formatDateToInput = formatDateToInput;
//# sourceMappingURL=dateUtils.js.map