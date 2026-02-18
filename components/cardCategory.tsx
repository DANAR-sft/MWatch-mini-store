import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IProduct } from "@/types/definitions";
import Link from "next/link";

export function CardCategory({
  id,
  name,
  description,
  price,
  stock,
  image_url,
  category,
}: IProduct) {
  return (
    <Card className="relative mx-auto w-full h-fit max-w-sm pt-0">
      <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
      <img
        src={image_url}
        alt="Event cover"
        className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
      />
      <CardHeader>
        <CardAction>
          <Badge variant="secondary">Featured</Badge>
        </CardAction>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Link href={`/products/detail-product/${id}`}>
          <Button className="w-full">View Detail</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
