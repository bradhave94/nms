import React from 'react';
import { Disclosure } from '@headlessui/react';
const MyDisclosure = () => {
	return (
		<div className="w-full px-4 pt-16">
			<div className="mx-auto w-full max-w-md rounded-2xl bg-white p-2">
				<Disclosure>
					<Disclosure.Button className="flex w-full justify-between rounded-lg bg-purple-100 px-4 py-2 text-left text-sm font-medium text-purple-900 hover:bg-purple-200 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75">
						Is team pricing available?
					</Disclosure.Button>
					<Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500">
						Yes! You can purchase a license that you can share with your entireteam.
					</Disclosure.Panel>
				</Disclosure>
			</div>
		</div>
	);
};
export default MyDisclosure;
