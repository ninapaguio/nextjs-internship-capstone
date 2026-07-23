declare module "*.css" {
	// added because the TS is not reading the .css file in the app.
	// it tells that TypeScript that any file ending in '.css' can be imported and should be treated as a valid module.
}
