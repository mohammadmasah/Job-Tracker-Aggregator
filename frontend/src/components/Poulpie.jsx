// Mascotte "Poulpie" — poulpe violet clair / bleu.
// talking  : léger rebond (quand le bot répond).
// thinking : Poulpie réfléchit à un contexte → yeux concentrés vers le haut + petite
//            bouche pensive. L'indication de CE sur quoi il est focus est portée par
//            la bulle affichée à côté de lui (dans ChatWidget), pas par des lunettes.
// size     : taille en px.
export default function Poulpie({ talking = false, thinking = false, size = 32 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            className={talking ? "mascotte-talking" : ""}
        >
            <defs>
                <linearGradient id="poulpie-body" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b794f6" />
                    <stop offset="100%" stopColor="#5a7fe0" />
                </linearGradient>
            </defs>

            {/* tentacules */}
            <g className="poulpie-tentacles" fill="url(#poulpie-body)">
                <path d="M16 40 C12 48 10 52 12 58 C14 54 16 52 18 50 C17 46 17 43 18 41 Z" />
                <path d="M24 44 C22 52 20 56 22 60 C24 56 25 53 27 51 C26 48 25 46 26 44 Z" />
                <path d="M40 44 C42 52 44 56 42 60 C40 56 39 53 37 51 C38 48 39 46 38 44 Z" />
                <path d="M48 40 C52 48 54 52 52 58 C50 54 48 52 46 50 C47 46 47 43 46 41 Z" />
            </g>

            {/* tête / corps */}
            <path
                d="M32 10 C44 10 52 20 52 32 C52 42 46 46 32 46 C18 46 12 42 12 32 C12 20 20 10 32 10 Z"
                fill="url(#poulpie-body)"
            />

            {/* joues roses */}
            <circle cx="22" cy="32" r="3" fill="#f6a6c8" opacity="0.6" />
            <circle cx="42" cy="32" r="3" fill="#f6a6c8" opacity="0.6" />

            {thinking ? (
                /* --- Mode réflexion : regard concentré vers le haut (pupilles hautes), pas de lunettes --- */
                <g className="mascotte-eyes">
                    <circle cx="25" cy="26" r="4.2" fill="#ffffff" />
                    <circle cx="39" cy="26" r="4.2" fill="#ffffff" />
                    {/* pupilles remontées → l'air pensif */}
                    <circle cx="25.5" cy="24.4" r="2" fill="#1a1530" />
                    <circle cx="39.5" cy="24.4" r="2" fill="#1a1530" />
                    <circle cx="24.4" cy="23.4" r="0.8" fill="#ffffff" />
                    <circle cx="38.4" cy="23.4" r="0.8" fill="#ffffff" />
                </g>
            ) : (
                /* --- Mode normal --- */
                <g className="mascotte-eyes">
                    <circle cx="25" cy="26" r="4.2" fill="#ffffff" />
                    <circle cx="39" cy="26" r="4.2" fill="#ffffff" />
                    <circle cx="26" cy="27" r="2.1" fill="#1a1530" />
                    <circle cx="40" cy="27" r="2.1" fill="#1a1530" />
                    <circle cx="24.6" cy="25.2" r="0.8" fill="#ffffff" />
                    <circle cx="38.6" cy="25.2" r="0.8" fill="#ffffff" />
                </g>
            )}

            {/* bouche : sourire normal, ou petite bouche pensive si thinking */}
            {thinking ? (
                <ellipse cx="31" cy="35" rx="1.3" ry="1" fill="#1a1530" />
            ) : (
                <path
                    d="M29 34 C30.5 36 33.5 36 35 34"
                    stroke="#1a1530"
                    strokeWidth="1.4"
                    fill="none"
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
}