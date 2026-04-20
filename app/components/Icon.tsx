import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

config.autoAddCss = false;

type IconProps = {
  icon: IconDefinition;
  className?: string;
  title?: string;
};

export function Icon({ icon, className, title }: IconProps) {
  return <FontAwesomeIcon icon={icon} className={className} title={title} />;
}
