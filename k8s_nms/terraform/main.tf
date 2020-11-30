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

variable "name" {
  type = string
  default = "terraform"
}

variable "num" {
  type = number
  default = 1
}

variable "size" {
  type = number
  default = 20
}

resource "aws_security_group" "kubernetes_ports" {
  name = "${var.name}-kubernetes_ports"
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
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
        Name = "${var.name}-k8s_cluster.${count.index}"
    }

    root_block_device {
      volume_size = "${var.size}"
    }
}

output "cluster_names" {
  value = ["${aws_instance.cluster_machine.*.tags.Name}"]
}

output "cluster_dns" {
  value = ["${aws_instance.cluster_machine.*.public_dns}"]
}
