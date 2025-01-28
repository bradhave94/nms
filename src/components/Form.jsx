export default function Form() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3">
			{/* Contact information */}
			<div className="relative overflow-hidden bg-gradient-to-b from-blue-500 to-blue-600 py-10 px-6 sm:px-10 xl:p-12">
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
				<p className="mt-6 max-w-3xl text-base text-blue-50">
					Let us know if you have any ideas or suggestions on how to improve our site.
				</p>
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
								className="block w-full rounded-md border-warm-gray-300 py-3 px-4 text-black shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
								className="block w-full rounded-md border-warm-gray-300 py-3 px-4 text-black shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
								className="block w-full rounded-md border-warm-gray-300 py-3 px-4 text-black shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
								className="block w-full rounded-md border-warm-gray-300 py-3 px-4 text-black shadow-sm focus:border-blue-500 focus:ring-blue-500"
								aria-describedby="message-max"
								defaultValue={''}
							/>
						</div>
					</div>
					<div className="sm:col-span-2 sm:flex sm:justify-end">
						<button
							type="submit"
							className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-transparent bg-blue-500 px-6 py-3 text-base font-medium text-black shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
						>
							Submit
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
