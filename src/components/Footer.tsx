import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t-4 border-foreground bg-card mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary flex items-center justify-center border-2 border-foreground">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-black text-lg">NETWORTH</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="text-sm font-bold uppercase tracking-wider hover:text-primary transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-sm font-bold uppercase tracking-wider hover:text-primary transition-colors">
              Privacy
            </Link>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            © {new Date().getFullYear()} NetWorth. All rights reserved.
          </p>
        </div>
        <div className="mt-6 pt-6 border-t-2 border-foreground/20 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            🔐 Zero-Knowledge Encryption • Your data is encrypted on your device
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
