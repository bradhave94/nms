export default function Example() {
	return (
		<div className="bg-gray-50">
			<div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">


				<div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:grid-rows-2 sm:gap-x-6 lg:gap-8">
					<div className="group aspect-w-2 aspect-h-1 overflow-hidden rounded-lg sm:aspect-h-1 sm:aspect-w-1 sm:row-span-2">
						<img
							src="https://tailwindui.com/img/ecommerce-images/home-page-03-featured-category.jpg"
							alt="Two models wearing women's black cotton crewneck tee and off-white cotton crewneck tee."
							className="object-cover object-center group-hover:opacity-75"
						/>
						<div
							aria-hidden="true"
							className="bg-gradient-to-b from-transparent to-black opacity-50"
						/>
						<div className="flex items-end p-6">
							<div>
								<h3 className="font-semibold text-white">
									<a href="#">
										<span className="absolute inset-0" />
										New Arrivals
									</a>
								</h3>
								<p aria-hidden="true" className="mt-1 text-sm text-white">
									Shop now
								</p>
							</div>
						</div>
					</div>
					<div className="group aspect-w-2 aspect-h-1 overflow-hidden rounded-lg sm:aspect-none sm:relative sm:h-full">
						<img
							src="https://tailwindui.com/img/ecommerce-images/home-page-03-category-01.jpg"
							alt="Wooden shelf with gray and olive drab green baseball caps, next to wooden clothes hanger with sweaters."
							className="object-cover object-center group-hover:opacity-75 sm:absolute sm:inset-0 sm:h-full sm:w-full"
						/>
						<div
							aria-hidden="true"
							className="bg-gradient-to-b from-transparent to-black opacity-50 sm:absolute sm:inset-0"
						/>
						<div className="flex items-end p-6 sm:absolute sm:inset-0">
							<div>
								<h3 className="font-semibold text-white">
									<a href="#">
										<span className="absolute inset-0" />
										Accessories
									</a>
								</h3>
								<p aria-hidden="true" className="mt-1 text-sm text-white">
									Shop now
								</p>
							</div>
						</div>
					</div>
					<div className="group aspect-w-2 aspect-h-1 overflow-hidden rounded-lg sm:aspect-none sm:relative sm:h-full">
						<img
							src="https://tailwindui.com/img/ecommerce-images/home-page-03-category-02.jpg"
							alt="Walnut desk organizer set with white modular trays, next to porcelain mug on wooden desk."
							className="object-cover object-center group-hover:opacity-75 sm:absolute sm:inset-0 sm:h-full sm:w-full"
						/>
						<div
							aria-hidden="true"
							className="bg-gradient-to-b from-transparent to-black opacity-50 sm:absolute sm:inset-0"
						/>
						<div className="flex items-end p-6 sm:absolute sm:inset-0">
							<div>
								<h3 className="font-semibold text-white">
									<a href="#">
										<span className="absolute inset-0" />
										Workspace
									</a>
								</h3>
								<p aria-hidden="true" className="mt-1 text-sm text-white">
									Shop now
								</p>
							</div>
						</div>
					</div>
					<div className="relative overflow-hidden rounded-lg lg:h-96 col-span-2">
						<div className="absolute inset-0">
							<img
								src="https://tailwindui.com/img/ecommerce-images/category-page-01-featured-collection.jpg"
								alt=""
								className="h-full w-full object-cover object-center"
							/>
						</div>
						<div aria-hidden="true" className="relative h-96 w-full lg:hidden" />
						<div aria-hidden="true" className="relative h-32 w-full lg:hidden" />
						<div className="absolute inset-x-0 bottom-0 rounded-bl-lg rounded-br-lg bg-black bg-opacity-75 p-6 backdrop-blur backdrop-filter sm:flex sm:items-center sm:justify-between lg:inset-y-0 lg:inset-x-auto lg:w-96 lg:flex-col lg:items-start lg:rounded-tl-lg lg:rounded-br-none">
							<div>
								<h2 className="text-xl font-bold text-white">
									Workspace Collection
								</h2>
								<p className="mt-1 text-sm text-gray-300">
									Upgrade your desk with objects that keep you organized and
									clear-minded.
								</p>
							</div>
							<a
								href="#"
								className="mt-6 flex flex-shrink-0 items-center justify-center rounded-md border border-white border-opacity-25 bg-white bg-opacity-0 py-3 px-4 text-base font-medium text-white hover:bg-opacity-10 sm:mt-0 sm:ml-8 lg:ml-0 lg:w-full"
							>
								View the collection
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
