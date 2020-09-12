provider "aws" {
    region = "us-east-2"
}

variable "key_name" {
  type = string
}

variable "ami" {
  type = string
  default = "ami-0bbe28eb2173f6167"
}

variable "type" {
  type = string
  default = "t2.micro"
}

variable "num" {
  type = number
  default = 1
}

resource "aws_security_group" "kubernetes_ports" {
  name = "kubernetes_ports"
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 60000
    to_port = 60000
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 443
    to_port = 443
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 6443
    to_port = 6443
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 2379
    to_port = 2379
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 2380
    to_port = 2380
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 10250
    to_port = 10250
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 10251
    to_port = 10251
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 10252
    to_port = 10252
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "cluster_machine" {
    count = var.num
    ami = var.ami
    instance_type = var.type
    vpc_security_group_ids = [aws_security_group.kubernetes_ports.id]
    key_name = var.key_name

    tags = {
        Name = "k8s_cluster.${count.index}"
    }
}

output "cluster_names" {
  value = ["${aws_instance.cluster_machine.*.tags.Name}"]
}

output "cluster_dns" {
  value = ["${aws_instance.cluster_machine.*.public_dns}"]
}
