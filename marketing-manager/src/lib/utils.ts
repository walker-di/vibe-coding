import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { cubicOut } from "svelte/easing";
import { derived, get, writable } from "svelte/store";
import type { TransitionConfig } from "svelte/transition";
import { twMerge } from "tailwind-merge";
import { error } from "@sveltejs/kit";
import { persisted } from "svelte-local-storage-store";
import type { WithElementRef } from "bits-ui";
import type {
	HTMLAnchorAttributes,
	HTMLAttributes,
	HTMLButtonAttributes,
	HTMLImgAttributes,
	HTMLInputAttributes,
	HTMLLabelAttributes,
	HTMLLiAttributes,
	HTMLOlAttributes,
	HTMLTableAttributes,
	HTMLTdAttributes,
	HTMLTextareaAttributes,
	HTMLThAttributes,
} from "svelte/elements";


export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const isBrowser = typeof document !== "undefined";

export function slugFromPath(path: string) {
	return path.replace("/src/content/", "").replace(".md", "");
}

export function hexToHsl(hex: string): [number, number, number] {
	if (hex) {
		const sanitizedHex = hex.replace("#", "");

		const red = Number.parseInt(sanitizedHex.substring(0, 2), 16);
		const green = Number.parseInt(sanitizedHex.substring(2, 4), 16);
		const blue = Number.parseInt(sanitizedHex.substring(4, 6), 16);

		const normalizedRed = red / 255;
		const normalizedGreen = green / 255;
		const normalizedBlue = blue / 255;

		const max = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
		const min = Math.min(normalizedRed, normalizedGreen, normalizedBlue);

		let hue, saturation, lightness;

		if (max === min) {
			hue = 0;
		} else if (max === normalizedRed) {
			hue = ((normalizedGreen - normalizedBlue) / (max - min)) % 6;
		} else if (max === normalizedGreen) {
			hue = (normalizedBlue - normalizedRed) / (max - min) + 2;
		} else {
			hue = (normalizedRed - normalizedGreen) / (max - min) + 4;
		}

		hue = Math.round(hue * 60);

		if (hue < 0) {
			hue += 360;
		}

		lightness = (max + min) / 2;

		if (max === min) {
			saturation = 0;
		} else if (lightness <= 0.5) {
			saturation = (max - min) / (max + min);
		} else {
			saturation = (max - min) / (2 - max - min);
		}

		saturation = Math.round(saturation * 100);
		lightness = Math.round(lightness * 100);

		return [hue, saturation, lightness];
	}
	return [0, 0, 0];
}

export function hexToRgb(hex: string): [number, number, number] {
	if (hex) {
		const sanitizedHex = hex.replace("#", "");

		const red = Number.parseInt(sanitizedHex.substring(0, 2), 16);
		const green = Number.parseInt(sanitizedHex.substring(2, 4), 16);
		const blue = Number.parseInt(sanitizedHex.substring(4, 6), 16);

		return [red, green, blue];
	}
	return [0, 0, 0];
}

export function createCopyCodeButton() {
	const codeString = writable("");
	const copied = writable(false);
	let copyTimeout = 0;

	function copyCode() {
		if (!isBrowser) return;
		navigator.clipboard.writeText(get(codeString));
		copied.set(true);
		clearTimeout(copyTimeout);
		copyTimeout = window.setTimeout(() => {
			copied.set(false);
		}, 2500);
	}

	function setCodeString(node: HTMLElement) {
		codeString.set(node.innerText.trim() ?? "");
	}

	return {
		copied,
		copyCode,
		setCodeString,
		codeString,
	};
}

export function updateTheme(activeTheme: string, path: string) {
	if (!isBrowser) return;
	document.body.classList.forEach((className) => {
		if (className.match(/^theme.*/)) {
			document.body.classList.remove(className);
		}
	});

	const theme = path === "/themes" ? activeTheme : null;
	if (theme) {
		return document.body.classList.add(`theme-${theme}`);
	}
}

type FlyAndScaleParams = {
	y?: number;
	x?: number;
	start?: number;
	duration?: number;
};

export function styleToString(style: Record<string, number | string | undefined>): string {
	return Object.keys(style).reduce((str, key) => {
		if (style[key] === undefined) return str;
		return `${str}${key}:${style[key]};`;
	}, "");
}

export function flyAndScale(
	node: Element,
	params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 }
): TransitionConfig {
	const style = getComputedStyle(node);
	const transform = style.transform === "none" ? "" : style.transform;

	const scaleConversion = (
		valueA: number,
		scaleA: [number, number],
		scaleB: [number, number]
	) => {
		const [minA, maxA] = scaleA;
		const [minB, maxB] = scaleB;

		const percentage = (valueA - minA) / (maxA - minA);
		const valueB = percentage * (maxB - minB) + minB;

		return valueB;
	};

	return {
		duration: params.duration ?? 200,
		delay: 0,
		css: (t) => {
			const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
			const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
			const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

			return styleToString({
				transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				opacity: t,
			});
		},
		easing: cubicOut,
	};
}

type Modules = Record<string, () => Promise<unknown>>;


export function slugFromPathname(pathname: string) {
	return pathname.split("/").pop() ?? "";
}

const liftMode = persisted<string[]>("lift-mode", []);

export function getLiftMode(name: string) {
	function toggleLiftMode(name: string) {
		liftMode.update((prev) => {
			return prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
		});
	}

	const isLiftMode = derived(liftMode, ($configStore) => $configStore.includes(name));

	return {
		isLiftMode,
		toggleLiftMode,
	};
}

// Wrappers around svelte's `HTMLAttributes` types to add a `ref` prop can be bound to
// to get a reference to the underlying DOM element the component is rendering.
export type PrimitiveDivAttributes = WithElementRef<HTMLAttributes<HTMLDivElement>>;
export type PrimitiveElementAttributes = WithElementRef<HTMLAttributes<HTMLElement>>;
export type PrimitiveAnchorAttributes = WithElementRef<HTMLAnchorAttributes>;
export type PrimitiveButtonAttributes = WithElementRef<HTMLButtonAttributes>;
export type PrimitiveInputAttributes = WithElementRef<HTMLInputAttributes>;
export type PrimitiveSpanAttributes = WithElementRef<HTMLAttributes<HTMLSpanElement>>;
export type PrimitiveTextareaAttributes = WithElementRef<HTMLTextareaAttributes>;
export type PrimitiveHeadingAttributes = WithElementRef<HTMLAttributes<HTMLHeadingElement>>;
export type PrimitiveLiAttributes = WithElementRef<HTMLLiAttributes>;
export type PrimitiveOlAttributes = WithElementRef<HTMLOlAttributes>;
export type PrimitiveLabelAttributes = WithElementRef<HTMLLabelAttributes>;
export type PrimitiveUlAttributes = WithElementRef<HTMLAttributes<HTMLUListElement>>;
export type PrimitiveTableAttributes = WithElementRef<HTMLTableAttributes>;
export type PrimitiveTdAttributes = WithElementRef<HTMLTdAttributes>;
export type PrimitiveTrAttributes = WithElementRef<HTMLAttributes<HTMLTableRowElement>>;
export type PrimitiveThAttributes = WithElementRef<HTMLThAttributes>;
export type PrimitiveTableSectionAttributes = WithElementRef<
	HTMLAttributes<HTMLTableSectionElement>
>;
export type PrimitiveImgAttributes = WithElementRef<HTMLImgAttributes>;