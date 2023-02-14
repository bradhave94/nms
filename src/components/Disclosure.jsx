import React from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/20/solid';

export default function Example(props) {
    const inputRef = React.useRef()
	return (
		<div className="mx-auto w-full rounded-md p-2">
			<Disclosure ref={inputRef}>
				{({ open }) => (
					<>
						<Disclosure.Button className="flex w-full justify-between rounded-lg bg-purple-100 px-4 py-2 text-left text-sm font-medium text-purple-900 hover:bg-purple-200 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75">
							<span>{props.title}</span>
							<ChevronUpIcon
								className={`${
									open ? 'rotate-180 transform' : ''
								} h-5 w-5 text-purple-500`}
							/>
						</Disclosure.Button>
						<Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500">
							{props.desc}
						</Disclosure.Panel>
					</>
				)}
			</Disclosure>
		</div>
	);
}
