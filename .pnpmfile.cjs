// eslint-disable-next-line notice/notice
module.exports = {
	hooks: {
		async afterAllResolved(lockfile) {
			/**
			 * This file can be removed once pnpm has fixed the issue where tarball URLs
			 * are included in the lockfile even with lockfileIncludeTarballUrl.
			 * See https://github.com/pnpm/pnpm/issues/6667
			 */
			for (const key in lockfile.packages) {
				const tarball = lockfile.packages[key].resolution?.tarball;

				if (tarball && !tarball.startsWith("file:")) {
					delete lockfile.packages[key].resolution.tarball;
				}
			}

			return lockfile;
		}
	}
};
