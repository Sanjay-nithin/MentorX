import FeaturesGrid from '../../components/LandingPage/Features/FeaturesGrid';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SignInModal from '../../components/LandingPage/Auth/SignInModal';

function LandingPage() {
	const isLoggedIn = useSelector(state => state.auth.isLoggedIn);
	const navigate = useNavigate();
	const [showAuth, setShowAuth] = useState(false);
	return (
		<>
			<section className="relative min-h-screen flex items-center justify-center px-6 text-center pt-32 md:pt-40">
				{/* Hero content centered vertically in the viewport */}
				<div className="mx-auto max-w-6xl">
					{/* Heading with elegant wave accent */}
					<div className="relative inline-block">
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
							Where Learning Becomes Mastery
						</h1>
						{/* Black wave accent under the heading */}
						<svg
							aria-hidden="true"
							className="absolute left-1/2 -translate-x-1/2 w-[280px] md:w-[420px] lg:w-[520px] h-8 md:h-10 mt-3"
							viewBox="0 0 340 24"
							preserveAspectRatio="none"
						>
							<path
								d="M0 12 C40 24, 80 0, 120 12 C160 24, 200 0, 240 12 C280 24, 320 0, 360 12"
								fill="none"
								stroke="black"
								strokeWidth="3"
								opacity="0.6"
							/>
						</svg>
					</div>

					<p className="mt-10 md:mt-12 text-xl md:text-xl lg:text-2xl leading-relaxed text-white/80 max-w-4xl mx-auto">
						Deep explanations, adaptive questions, and AI reasoning support to build true understanding.
					</p>

					{/* CTA row with sharp button, white shadow, and subtle black wave detail */}
					<div className="mt-14 md:mt-16 flex justify-center gap-4 flex-wrap">
						<div className="relative">
							{/* Decorative black wave on the button */}
							<svg
								aria-hidden="true"
								className="absolute left-1/2 -translate-x-1/2 -top-3 w-24 h-4"
								viewBox="0 0 120 16"
								preserveAspectRatio="none"
							>
								<path
									d="M0 8 C20 16, 40 0, 60 8 C80 16, 100 0, 120 8"
									fill="none"
									stroke="black"
									strokeWidth="2"
									opacity="0.6"
								/>
							</svg>
							<button
								onClick={() => {
									if (!isLoggedIn) {
										setShowAuth(true);
									} else {
										navigate('/dashboard');
									}
								}}
								className="inline-flex items-center gap-2 rounded-full bg-white text-black px-8 py-3.5 font-semibold shadow-[0_8px_30px_rgba(255,255,255,0.25)] hover:shadow-[0_12px_40px_rgba(255,255,255,0.35)] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-300"
							>
								<span>Get Started</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="currentColor"
									className="h-5 w-5"
								>
									<path d="M13.5 5.5a1 1 0 0 1 1.5 0l5 5a1 1 0 0 1 0 1.5l-5 5a1 1 0 1 1-1.5-1.5l3.293-3.293H4a1 1 0 1 1 0-2h12.793L13.5 7a1 1 0 0 1 0-1.5Z" />
								</svg>
							</button>
						</div>

						<button
							onClick={() => {
								const el = document.getElementById('features');
								if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
							}}
							className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-transparent px-8 py-3.5 font-semibold text-white hover:border-white/50 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all duration-300"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="h-5 w-5"
							>
								<path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 4a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 12 6Zm1.25 12h-2.5a.75.75 0 0 1 0-1.5h.25v-5h-.25a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 .75.75v5.75h.25a.75.75 0 0 1 0 1.5Z" />
							</svg>
							<span>Learn More</span>
						</button>
					</div>
				</div>
			</section>

			{/* Features section */}
			<FeaturesGrid />

			{showAuth && (
				<SignInModal open={showAuth} onClose={() => setShowAuth(false)} defaultMode={'signin'} />
			)}

		</>
	);
}

export default LandingPage;
