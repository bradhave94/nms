const social = [
	{
		name: 'GitHub',
		href: 'https://github.com/bradhave94/nms',
		icon: (props) => (
			<svg fill="currentColor" viewBox="0 0 24 24" {...props}>
				<path
					fillRule="evenodd"
					d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
					clipRule="evenodd"
				/>
			</svg>
		),
	},
	{
		name: 'Twitter',
		href: 'https://twitter.com/bradhave',
		icon: (props) => (
			<svg fill="currentColor" viewBox="0 0 24 24" {...props}>
				<path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
			</svg>
		),
	},
];

export default function Form() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3">
			{/* Contact information */}
			<div className="relative overflow-hidden bg-gradient-to-b from-orange-500 to-orange-600 py-10 px-6 sm:px-10 xl:p-12">
				{/* Decorative angle backgrounds */}
				<div className="pointer-events-none absolute inset-0 sm:hidden" aria-hidden="true">
					<svg
						className="absolute inset-0 h-full w-full"
						width={343}
						height={388}
						viewBox="0 0 343 388"
						fill="none"
						preserveAspectRatio="xMidYMid slice"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M-99 461.107L608.107-246l707.103 707.107-707.103 707.103L-99 461.107z"
							fill="url(#linear1)"
							fillOpacity=".1"
						/>
						<defs>
							<linearGradient
								id="linear1"
								x1="254.553"
								y1="107.554"
								x2="961.66"
								y2="814.66"
								gradientUnits="userSpaceOnUse"
							>
								<stop stopColor="#fff" />
								<stop offset={1} stopColor="#fff" stopOpacity={0} />
							</linearGradient>
						</defs>
					</svg>
				</div>
				<div
					className="pointer-events-none absolute top-0 right-0 bottom-0 hidden w-1/2 sm:block lg:hidden"
					aria-hidden="true"
				>
					<svg
						className="absolute inset-0 h-full w-full"
						width={359}
						height={339}
						viewBox="0 0 359 339"
						fill="none"
						preserveAspectRatio="xMidYMid slice"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M-161 382.107L546.107-325l707.103 707.107-707.103 707.103L-161 382.107z"
							fill="url(#linear2)"
							fillOpacity=".1"
						/>
						<defs>
							<linearGradient
								id="linear2"
								x1="192.553"
								y1="28.553"
								x2="899.66"
								y2="735.66"
								gradientUnits="userSpaceOnUse"
							>
								<stop stopColor="#fff" />
								<stop offset={1} stopColor="#fff" stopOpacity={0} />
							</linearGradient>
						</defs>
					</svg>
				</div>
				<div
					className="pointer-events-none absolute top-0 right-0 bottom-0 hidden w-1/2 lg:block"
					aria-hidden="true"
				>
					<svg
						className="absolute inset-0 h-full w-full"
						width={160}
						height={678}
						viewBox="0 0 160 678"
						fill="none"
						preserveAspectRatio="xMidYMid slice"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M-161 679.107L546.107-28l707.103 707.107-707.103 707.103L-161 679.107z"
							fill="url(#linear3)"
							fillOpacity=".1"
						/>
						<defs>
							<linearGradient
								id="linear3"
								x1="192.553"
								y1="325.553"
								x2="899.66"
								y2="1032.66"
								gradientUnits="userSpaceOnUse"
							>
								<stop stopColor="#fff" />
								<stop offset={1} stopColor="#fff" stopOpacity={0} />
							</linearGradient>
						</defs>
					</svg>
				</div>
				<h1 className="text-3xl font-medium text-white">Share your feedback</h1>
				<p className="mt-6 max-w-3xl text-base text-orange-50">
					Let us know if you have any ideas or suggestions on how to improve our site.
				</p>
				<div className="mt-6 flex space-x-5">
					{social.map((item) => (
						<a
							key={item.name}
							href={item.href}
							target="_blank"
							rel="noopener"
							className="text-white hover:text-orange-700"
						>
							<span className="sr-only">{item.name}</span>
							<item.icon className="h-6 w-6" aria-hidden="true" />
						</a>
					))}
				</div>
			</div>

			{/* Contact form */}
			<div className="py-10 px-6 sm:px-10 lg:col-span-2 xl:p-12 bg-black">
				<h3 className="text-lg font-medium text-white">Send us a message</h3>
				<form
					action="https://formspree.io/mzbjbkzw"
					method="POST"
					className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8"
				>
					<div>
						<label htmlFor="name" className="block text-sm font-medium text-white">
							Name
						</label>
						<div className="mt-1">
							<input
								type="text"
								name="name"
								id="name"
								autoComplete="given-name"
								className="block w-full rounded-md border-warm-gray-300 py-3 px-4 text-black shadow-sm focus:border-orange-500 focus:ring-orange-500"
							/>
						</div>
					</div>
					<div>
						<label htmlFor="email" className="block text-sm font-medium text-white">
							Email
						</label>
						<div className="mt-1">
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								className="block w-full rounded-md border-warm-gray-300 py-3 px-4 text-black shadow-sm focus:border-orange-500 focus:ring-orange-500"
							/>
						</div>
					</div>
					<div className="sm:col-span-2">
						<label htmlFor="subject" className="block text-sm font-medium text-white">
							Subject
						</label>
						<div className="mt-1">
							<input
								type="text"
								name="subject"
								id="subject"
								className="block w-full rounded-md border-warm-gray-300 py-3 px-4 text-black shadow-sm focus:border-orange-500 focus:ring-orange-500"
							/>
						</div>
					</div>
					<div className="sm:col-span-2">
						<label htmlFor="message" className="block text-sm font-medium text-white">
							Message
						</label>
						<div className="mt-1">
							<textarea
								id="message"
								name="message"
								rows={4}
								className="block w-full rounded-md border-warm-gray-300 py-3 px-4 text-black shadow-sm focus:border-orange-500 focus:ring-orange-500"
								aria-describedby="message-max"
								defaultValue={''}
							/>
						</div>
					</div>
					<div className="sm:col-span-2 sm:flex sm:justify-end">
						<button
							type="submit"
							className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-transparent bg-orange-500 px-6 py-3 text-base font-medium text-black shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:w-auto"
						>
							Submit
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
