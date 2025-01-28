import { SITE } from '../config';

const navigation = [
  { name: 'Refining', href: '/refining' },
  { name: 'Cooking', href: '/cooking' },
  { name: 'Crafting', href: '/crafting-guide' },
  { name: 'Calculator', href: '/calculator' },
  { name: 'Feedback', href: '/feedback' },
];

export default function Footer() {
  return (
    <footer className="bg-black flex flex-1 flex-col lg:pl-80">
      <div className="p-6 py-12 max-w-4xl mx-auto">
        <nav className="grid grid-cols-2 sm:flex sm:justify-center sm:space-x-12 gap-6" aria-label="Footer">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-sm leading-6 text-white hover:text-blue-500 transition-colors"
            >
              {item.name}
            </a>
          ))}
        </nav>
        <p className="mt-8 text-center text-xs leading-5 text-gray-500">
          No Man's Sky Recipes | Updated to{' '}
          <a
            className="hover:text-blue-500 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            href={SITE.version_link}
          >
            {SITE.version_name} {SITE.version}
          </a>
        </p>
        <div className="disclaimer">
          <p>This is a fan-made website. No Man's Sky™ and all related assets are trademarks
          of Hello Games. This site is not affiliated with or endorsed by Hello Games.</p>
          <p className="mt-2">
            <a href="/privacy" className="text-blue-500 hover:text-blue-400">Privacy Policy</a>
          </p>
        </div>
      </div>
    </footer>
  );
}