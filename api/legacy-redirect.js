import fs from "node:fs";
import path from "node:path";

const REDIRECTS_FILE = path.join(process.cwd(), "redirects.generated.json");

/** @type {Map<string, string> | null} */
let redirectLookup = null;

const asSingleValue = (value) => {
	if (Array.isArray(value)) {
		return value[0];
	}
	return value;
};

const loadRedirectLookup = () => {
	if (redirectLookup) {
		return redirectLookup;
	}

	const contents = fs.readFileSync(REDIRECTS_FILE, "utf-8");
	const redirects = JSON.parse(contents);

	redirectLookup = new Map(
		redirects
			.filter((redirect) => redirect?.source && redirect?.destination)
			.map((redirect) => [redirect.source, redirect.destination])
	);

	return redirectLookup;
};

export default function handler(req, res) {
	try {
		const segment = asSingleValue(req.query.segment);
		const id = asSingleValue(req.query.id);

		if (!segment || !id) {
			res.statusCode = 400;
			res.setHeader("content-type", "application/json; charset=utf-8");
			res.end(JSON.stringify({ error: "Missing segment or id query parameter." }));
			return;
		}

		const source = `/${segment}/${id}`;
		const destination = loadRedirectLookup().get(source);

		if (!destination) {
			res.statusCode = 404;
			res.end("Not found");
			return;
		}

		res.statusCode = 308;
		res.setHeader("location", destination);
		res.setHeader("cache-control", "public, max-age=31536000, immutable");
		res.end();
	} catch (error) {
		res.statusCode = 500;
		res.setHeader("content-type", "application/json; charset=utf-8");
		res.end(
			JSON.stringify({
				error: "Failed to resolve redirect.",
				details: error instanceof Error ? error.message : String(error),
			})
		);
	}
}
